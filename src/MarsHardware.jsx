// AI-assisted scene integration. Rover geometry/textures: NASA/JPL, unchanged source asset.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, useGLTF } from '@react-three/drei';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { terrainHeight } from './marsPhysics.js';
import { DEFAULT_MARS_CONFIGURATION } from './marsConfiguration.js';

export function Beam({ a, b, width = .05, color = '#827c68' }) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
  return <mesh castShadow position={start.clone().add(end).multiplyScalar(.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())}>
    <cylinderGeometry args={[width, width, d.length(), 10]} /><meshStandardMaterial color={color} metalness={.75} roughness={.45} />
  </mesh>;
}

// NASA supplies the wheel set as one object. Partition its triangles into six
// independent rolling assemblies while preserving the original UVs and materials.
function rigWheels(model) {
  model.updateMatrixWorld(true);
  const original = model.getObjectByName('Wheels_objs');
  if (!original) return [];
  const bounds = new THREE.Box3().setFromObject(original);
  const size = bounds.getSize(new THREE.Vector3());
  const xs = [bounds.min.x + .16, bounds.max.x - .16];
  const zs = [bounds.min.z + .29, (bounds.min.z + bounds.max.z) / 2, bounds.max.z - .29];
  const centers = xs.flatMap(x => zs.map(z => new THREE.Vector3(x, bounds.min.y + size.y / 2, z)));
  const wheels = centers.map(center => { const group = new THREE.Group(); group.position.copy(center); model.add(group); return group; });
  original.traverse(child => {
    if (!child.isMesh) return;
    const g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    g.applyMatrix4(child.matrixWorld);
    const p = g.attributes.position;
    const bins = centers.map(() => []);
    for (let i = 0; i < p.count; i += 3) {
      const c = new THREE.Vector3();
      for (let k = 0; k < 3; k++) c.add(new THREE.Vector3().fromBufferAttribute(p, i + k));
      c.divideScalar(3);
      let chosen = 0, best = Infinity;
      centers.forEach((center, j) => { const distance = c.distanceToSquared(center); if (distance < best) { chosen = j; best = distance; } });
      bins[chosen].push(i, i + 1, i + 2);
    }
    bins.forEach((indices, j) => {
      if (!indices.length) return;
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(g.attributes)) {
        const values = [];
        for (const index of indices) for (let k = 0; k < attribute.itemSize; k++) {
          let value = attribute.array[index * attribute.itemSize + k];
          if (name === 'position') value -= centers[j].getComponent(k);
          values.push(value);
        }
        geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, attribute.itemSize));
      }
      const mesh = new THREE.Mesh(geometry, child.material);
      mesh.castShadow = true; mesh.receiveShadow = true; wheels[j].add(mesh);
    });
    g.dispose();
  });
  original.visible = false;
  return wheels.map(group => ({ group, base: group.position.clone() }));
}

export function MarsRover({ state, preview = false, folded = false, configuration }) {
  const gltf = useGLTF('/mars/perseverance.glb', '/draco/');
  const model = useMemo(() => {
    const scene = clone(gltf.scene);
    scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return scene;
  }, [gltf.scene]);
  const wheels = useMemo(() => rigWheels(model), [model]);
  const installed=configuration||state?.current?.configuration||DEFAULT_MARS_CONFIGURATION;
  useEffect(()=>{
    const show=(name,visible)=>{const object=model.getObjectByName(name);if(object)object.visible=!!visible;};
    show('Cylinder',installed.camera);show('antenna_hg',installed.antenna);
    show('rtg',installed.power);show('lab',installed.scanner);show('PIXL',installed.scanner);
    show('suspension',installed.mobility);
    wheels.forEach(({group})=>{group.visible=!!installed.mobility;});
    model.traverse(object=>{if(/^arm[._]/.test(object.name)||object.name==='arm')object.visible=!!installed.arm;});
  },[model,wheels,installed]);
  const mixer = useMemo(() => {
    const animation = new THREE.AnimationMixer(model);
    gltf.animations.filter(clip => ['CylinderAction','bottomAction','topAction','Cylinder.002Action'].includes(clip.name))
      .forEach(clip => animation.clipAction(clip).play());
    animation.setTime(preview && !folded ? 5 : 0);
    return animation;
  }, [model, gltf.animations, preview, folded]);
  const root = useRef();
  const joints = useMemo(() => ['arm_01_pivot', 'arm_02_pivot', 'antenna_hg'].map(name => {
    const object = model.getObjectByName(name);
    return object ? { object, quaternion: object.quaternion.clone() } : null;
  }), [model]);
  useEffect(() => () => wheels.forEach(({ group }) => group.traverse(o => { if (o.isMesh) o.geometry.dispose(); })), [wheels]);
  useFrame(({ clock }) => {
    mixer.setTime(preview ? folded ? 0 : 5 : (state?.current?.deployment || 0) * 5);
    if (preview || !state?.current || !root.current) return;
    const s = state.current, r = s.rover;
    root.current.position.set(r.x, terrainHeight(r.x, r.z) + .04 + (1 - s.deployment) * .8, r.z - (1 - s.deployment) * 2);
    root.current.rotation.set((terrainHeight(r.x, r.z + .9) - terrainHeight(r.x, r.z - .9)) / 1.8, r.heading + Math.PI,
      (terrainHeight(r.x - .8, r.z) - terrainHeight(r.x + .8, r.z)) / 1.6);
    wheels.forEach(({ group, base }) => {
      group.rotation.x = -r.wheel;
      const localX = -base.x, localZ = -base.z;
      const x = r.x + localX * Math.cos(r.heading) + localZ * Math.sin(r.heading);
      const z = r.z - localX * Math.sin(r.heading) + localZ * Math.cos(r.heading);
      group.position.y = base.y + Math.max(-.13, Math.min(.13, terrainHeight(x, z) - terrainHeight(r.x, r.z)));
    });
    joints.forEach((joint, i) => {
      if (!joint) return;
      const angle = i === 2 ? (s.antenna ? -.35 : 0) : s.task === 'sample' ? Math.sin(clock.elapsedTime * 1.7 + i) * .12 : 0;
      joint.object.quaternion.copy(joint.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle));
    });
  });
  return <group ref={root} rotation={[0, Math.PI, 0]} scale={preview ? .85 : 1}><primitive object={model} /></group>;
}

function EngineBell({ position }) {
  return <group position={position}>
    <mesh castShadow><cylinderGeometry args={[.13, .32, .55, 32, 1, true]} /><meshStandardMaterial color="#4d5253" metalness={.85} roughness={.38} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, -.27, 0]}><torusGeometry args={[.31, .025, 8, 32]} /><meshStandardMaterial color="#bab3a4" metalness={.9} roughness={.35} /></mesh>
    {[-.16, -.08, 0, .08, .16].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.2 - y * .33, .012, 6, 24]} /><meshStandardMaterial color="#817b6d" metalness={.8} roughness={.4} /></mesh>)}
  </group>;
}

export function EnginePlume({ flight, position, transfer=false }) {
  const mesh = useRef();
  const uniforms = useMemo(() => ({ time: { value: 0 }, power: { value: 0 } }), []);
  useFrame(({ clock }) => {
    const s = flight.current;
    const throttle=transfer?70:s.throttle;
    mesh.current.visible = transfer ? s.phase==='transfer'&&s.burn>0&&s.serviceFuel>0 : s.phase === 'descent' && s.fuel > 0 && s.throttle > 0;
    uniforms.time.value = clock.elapsedTime;
    uniforms.power.value = throttle / 100;
    mesh.current.scale.y = .5 + throttle / 35;
  });
  return <mesh ref={mesh} position={position} rotation={[Math.PI, 0, 0]}>
    <cylinderGeometry args={[.18, .52, 1.9, 24, 12, true]} />
    <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} uniforms={uniforms}
      vertexShader={'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }'}
      fragmentShader={'varying vec2 vUv; uniform float time; uniform float power; void main(){float n=sin(vUv.y*67.-time*40.+sin(vUv.x*34.))*0.13;float a=pow(vUv.y,1.7)*(.65+n)*power;vec3 c=mix(vec3(.25,.45,1.),vec3(1.,.75,.35),pow(vUv.y,3.));gl_FragColor=vec4(c,a); }'} />
  </mesh>;
}

export function EntryCapsule({ flight }) {
  const body = useRef(), canopy = useRef(), plasma = useRef(), shield = useRef();
  const profile = useMemo(() => [new THREE.Vector2(0, -.5), new THREE.Vector2(1.1, -.4), new THREE.Vector2(2.28, -.05), new THREE.Vector2(2.36, .13)], []);
  const heat = useMemo(() => ({ time: { value: 0 }, heat: { value: 0 } }), []);
  useFrame(({ clock }) => {
    const s = flight.current;
    body.current.rotation.z = Math.sin(clock.elapsedTime * .6) * .015 + s.bank * Math.PI / 180 * .12;
    canopy.current.visible = s.chute;
    shield.current.visible = s.phase === 'entry';
    heat.time.value = clock.elapsedTime; heat.heat.value = s.heat / 100;
    plasma.current.visible = s.phase === 'entry' && s.heat > 2;
  });
  return <group ref={body}>
    <mesh position={[0, .85, 0]} castShadow><cylinderGeometry args={[.74, 2.28, 1.5, 48]} /><meshStandardMaterial color="#c6c4b8" metalness={.18} roughness={.72} /><Edges threshold={20} color="#797c75" /></mesh>
    <mesh position={[0, 1.67, 0]}><cylinderGeometry args={[.61, .74, .18, 32]} /><meshStandardMaterial color="#b7aca1" metalness={.65} roughness={.6} /></mesh>
    <mesh position={[0, 1.79, 0]}><cylinderGeometry args={[.49, .49, .1, 32]} /><meshStandardMaterial color="#4e5557" metalness={.8} roughness={.5} /></mesh>
    {Array.from({ length: 16 }, (_, i) => {
      const a = i * Math.PI / 8;
      return <group key={i}>
        <Beam a={[Math.sin(a) * .76, 1.6, Math.cos(a) * .76]} b={[Math.sin(a) * 2.29, .12, Math.cos(a) * 2.29]} width={.012} color="#6c706b" />
        {[.2, .6, 1].map(t => <mesh key={t} position={[Math.sin(a) * (2.3 - t), .12 + t * .97, Math.cos(a) * (2.3 - t)]}><sphereGeometry args={[.023, 6, 6]} /><meshStandardMaterial color="#525b5b" metalness={.7} roughness={.5} /></mesh>)}
      </group>;
    })}
    {[0, 1, 2, 3].map(i => {
      const a = i * Math.PI / 2;
      return <group key={i} position={[Math.sin(a) * 1.25, 1.05, Math.cos(a) * 1.25]} rotation={[0, a, 0]}>
        <mesh castShadow><boxGeometry args={[.5, .25, .25]} /><meshStandardMaterial color="#393f3e" metalness={.8} roughness={.5} /></mesh>
        <mesh position={[.18, 0, .15]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.06, .1, .17, 12]} /><meshStandardMaterial color="#6d7473" metalness={.9} roughness={.4} /></mesh>
      </group>;
    })}
    <group ref={shield}>
      <mesh castShadow><latheGeometry args={[profile, 64]} /><meshStandardMaterial color="#45352b" roughness={.96} side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 32 }, (_, i) => <mesh key={i} rotation={[0, i * Math.PI / 16, 0]} position={[Math.sin(i * Math.PI / 16) * 2.31, .08, Math.cos(i * Math.PI / 16) * 2.31]}><boxGeometry args={[.1, .07, .045]} /><meshStandardMaterial color="#8c7c65" metalness={.5} roughness={.8} /></mesh>)}
    </group>
    <mesh ref={plasma} position={[0, -.5, 0]}>
      <sphereGeometry args={[2.65, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} uniforms={heat}
        vertexShader={'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }'}
        fragmentShader={'varying vec2 vUv; uniform float heat;uniform float time;void main(){float n=.75+.25*sin(vUv.x*79.+time*31.+sin(vUv.y*34.));float a=heat*(.2+.65*sin(vUv.y*3.14159))*n;gl_FragColor=vec4(mix(vec3(1.,.12,.025),vec3(1.,.84,.35),vUv.y),a); }'} />
    </mesh>
    <group ref={canopy} position={[0, 18, 0]}>
      <mesh><sphereGeometry args={[7.5, 48, 18, 0, Math.PI * 2, 0, Math.PI * .44]} /><meshStandardMaterial color="#e9e1ce" side={THREE.DoubleSide} roughness={.92} /></mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const a = i * Math.PI / 12;
        return <group key={i}><Beam a={[Math.sin(a) * 7.3, 1.4, Math.cos(a) * 7.3]} b={[0, -16.2, 0]} width={.012} color="#c6c1b2" />
          {i % 3 === 0 && <mesh rotation={[0, a, 0]}><sphereGeometry args={[7.52, 3, 12, -.08, .16, 0, Math.PI * .44]} /><meshStandardMaterial color="#a44f38" side={THREE.DoubleSide} roughness={.9} /></mesh>}
        </group>;
      })}
    </group>
  </group>;
}

export function DescentPlatform({ flight,configuration,stowed=false }) {
  const installed=configuration||flight.current.configuration||DEFAULT_MARS_CONFIGURATION;
  const flamePositions = [[-1.8, .45, -1.45], [1.8, .45, -1.45], [-1.8, .45, 1.45], [1.8, .45, 1.45]];
  if(installed.engine>1)flamePositions.push([-1.8,.45,0],[1.8,.45,0],[-.9,.45,-1.45],[.9,.45,1.45]);
  return <group>
    <mesh position={[0, .9, 0]} castShadow><boxGeometry args={[3.8, .32, 3.2]} /><meshStandardMaterial color="#9d8960" metalness={.75} roughness={.43} /></mesh>
    <mesh position={[0, 1.15, 0]} castShadow><boxGeometry args={[3.3, .16, 2.7]} /><meshStandardMaterial color="#6e746c" metalness={.8} roughness={.4} /></mesh>
    {[-1, 1].map(side => <group key={side}>
      {installed.tank>(side===-1?0:1)&&<mesh position={[side * 1.3, 1.4, 0]} castShadow><sphereGeometry args={[.5, 24, 16]} /><meshStandardMaterial color="#a8955a" metalness={.8} roughness={.42} /></mesh>}
      {!!installed.legs&&!stowed&&<>
      <Beam a={[side * 1.1, .9, -1.1]} b={[side * 2.7, .13, -2]} width={.065} />
      <Beam a={[side * 1.1, .9, 1.1]} b={[side * 2.7, .13, 2]} width={.065} />
      {[-2, 2].map(z => <mesh key={z} position={[side * 2.7, .1, z]}><cylinderGeometry args={[.35, .4, .1, 16]} /><meshStandardMaterial color="#6d675a" metalness={.7} roughness={.65} /></mesh>)}
      </>}
      {[-1, 1].map(z => <Beam key={z} a={[side * 1.9, 1, z * 1.45]} b={[side * 1.1, 1.8, z * .9]} width={.045} />)}
    </group>)}
    {Array.from({length:Math.max(0,(installed.tank||0)-2)},(_,i)=><mesh key={i} position={[0,1.4,i?1.15:-1.15]} castShadow><sphereGeometry args={[.42,24,16]}/><meshStandardMaterial color="#a8955a" metalness={.8} roughness={.42}/></mesh>)}
    {!!installed.engine&&flamePositions.map((position, i) => <group key={i}><EngineBell position={position} /><EnginePlume flight={flight} position={[position[0], -.55, position[2]]} /></group>)}
    {!stowed&&<mesh position={[0, .45, 2.4]} rotation={[-.2, 0, 0]} receiveShadow><boxGeometry args={[2.4, .08, 2.9]} /><meshStandardMaterial color="#91917d" metalness={.75} roughness={.6} /></mesh>}
  </group>;
}

