// AI-assisted scene code. CC0 material photographs: Poly Haven. Fictional terrain.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { rocks, terrainHeight } from './marsPhysics.js';

function useRockMaterial() {
  const textures = useTexture(['/mars/rock-color.jpg', '/mars/rock-normal.jpg', '/mars/rock-rough.jpg']);
  return useMemo(() => {
    textures[0].colorSpace = THREE.SRGBColorSpace;
    textures.forEach(t => { t.anisotropy = 8; });
    return new THREE.MeshStandardMaterial({ map: textures[0], normalMap: textures[1], roughnessMap: textures[2],
      normalScale: new THREE.Vector2(.65, .65), roughness: 1, color: '#b98d6d' });
  }, [textures[0], textures[1], textures[2]]);
}
function SurfaceGround() {
  const original = useTexture(['/mars/ground-color.jpg', '/mars/ground-normal.jpg', '/mars/ground-rough.jpg']);
  const textures = useMemo(() => original.map((t, i) => {
    const texture = t.clone(); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(130, 130); texture.anisotropy = 16;
    if (!i) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true; return texture;
  }), [original[0], original[1], original[2]]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(650, 650, 240, 240); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), radius = Math.hypot(x, z);
      p.setY(i, terrainHeight(x, z) - .015 + Math.max(0, radius - 125) * .03);
    }
    g.computeVertexNormals(); return g;
  }, []);
  useEffect(() => () => { geometry.dispose(); textures.forEach(t => t.dispose()); }, [geometry, textures]);
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial map={textures[0]} normalMap={textures[1]} normalScale={[.5, .5]} color="#b77b53" roughness={1} />
  </mesh>;
}
function CliffWall({ angle, distance, width, height, index, material }) {
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(width * .63, width, height, 14, 18);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const erosion = Math.sin(y * .9 + index) * .6 + Math.sin(y * 2.3 + x * .2) * .35;
      const topRidge = Math.sin(x * .27 + index) * 2.7 + Math.cos(z * .19) * 2;
      p.setXYZ(i, x + Math.sin(z * .19 + index) * 2 + erosion, y + Math.max(0, y / height + .5) * topRidge,
        z + Math.sin(x * .21 + index) * 1.5 + erosion * .7);
    }
    g.computeVertexNormals(); return g;
  }, [width, height, index]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} position={[Math.sin(angle) * distance, height / 2 - 1, Math.cos(angle) * distance]} rotation={[0, angle, .03 * Math.sin(index)]} castShadow receiveShadow />;
}
function Boulders() {
  const material = useRockMaterial();
  const geometries = useMemo(() => Array.from({ length: 6 }, (_, seed) => {
    const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const factor = 1 + .14 * Math.sin(x * 7 + y * 5 + z * 9 + seed * 2.4);
      p.setXYZ(i, x * factor, y * factor, z * factor);
    }
    g.computeVertexNormals(); return g;
  }), []);
  const gravel = useRef();
  useEffect(() => {
    const object = new THREE.Object3D(), color = new THREE.Color();
    for (let i = 0; i < 1600; i++) {
      const angle = i * 2.39996, radius = Math.sqrt((i * 71 % 1601) / 1601) * 115;
      const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius, scale = .045 + i % 8 * .025;
      object.position.set(x, terrainHeight(x, z) + scale * .15, z);
      object.scale.set(scale * 1.3, scale * .65, scale);
      object.rotation.set(i * .1, i * .7, i * .3); object.updateMatrix();
      gravel.current.setMatrixAt(i, object.matrix);
      color.setHSL(.065, .18, .5 + i % 5 * .03); gravel.current.setColorAt(i, color);
    }
    gravel.current.instanceMatrix.needsUpdate = true;
  }, []);
  useEffect(() => () => { geometries.forEach(g => g.dispose()); material.dispose(); }, [geometries, material]);
  return <>
    {rocks.map((rock, i) => <mesh key={i} geometry={geometries[i % 6]} material={material}
      position={[rock.x, terrainHeight(rock.x, rock.z) + rock.radius * .4, rock.z]}
      scale={[rock.radius * 1.1, rock.radius * .8, rock.radius]} rotation={[i * .4, i * 1.2, i * .2]} castShadow receiveShadow />)}
    <instancedMesh ref={gravel} args={[geometries[0], material, 1600]} receiveShadow />
  </>;
}
export function MarsSurface() {
  const material = useRockMaterial();
  useEffect(() => () => material.dispose(), [material]);
  return <>
    <SurfaceGround /><Boulders />
    {Array.from({ length: 22 }, (_, i) => i>=9&&i<=12 ? null : <CliffWall key={i} angle={i * Math.PI / 11} distance={155 + Math.sin(i * 4) * 18}
      width={23 + i % 4 * 5} height={28 + i % 5 * 8} index={i} material={material} />)}
    {Array.from({ length: 15 }, (_, i) => <CliffWall key={`far${i}`} angle={i * Math.PI / 7.5} distance={270}
      width={55} height={45 + i % 5 * 13} index={i + 30} material={material} />)}
  </>;
}

export function MartianSky({ flight }) {
  const material = useRef();
  const uniforms = useMemo(() => ({ darkness: { value: 0 }, sun: { value: new THREE.Vector3(-.6, .22, -.7).normalize() } }), []);
  useFrame(({ scene }) => {
    const height = flight.current.altitude;
    const dark = THREE.MathUtils.smoothstep(height, 15000, 65000);
    uniforms.darkness.value = dark;
    if (scene.fog) {
      scene.fog.color.set('#a99076').lerp(new THREE.Color('#070c14'), dark);
      scene.fog.near = 125; scene.fog.far = 430;
    }
  });
  return <mesh scale={800}>
    <sphereGeometry args={[1, 48, 32]} />
    <shaderMaterial ref={material} side={THREE.BackSide} depthWrite={false} uniforms={uniforms}
      vertexShader={'varying vec3 direction;void main(){direction=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }'}
      fragmentShader={'varying vec3 direction;uniform vec3 sun;uniform float darkness;void main(){vec3 d=normalize(direction);float y=max(0.,d.y);vec3 c=mix(vec3(.73,.57,.41),vec3(.40,.37,.34),pow(y,.45));float glow=pow(max(dot(d,sun),0.),18.);c+=vec3(.3,.22,.11)*glow;float disk=smoothstep(.9991,.99955,dot(d,sun));c=mix(c,vec3(1.,.94,.78),disk);c=mix(c,vec3(.008,.013,.024),darkness);gl_FragColor=vec4(c,1.); }'} />
  </mesh>;
}

export function MarsDust({ flight }) {
  const count = 130;
  const particles = useMemo(() => Array.from({ length: count }, () => ({ age: 2, x: 0, y: -100, z: 0, vx: 0, vz: 0 })), []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('age', new THREE.BufferAttribute(new Float32Array(count).fill(1), 1));
    return g;
  }, []);
  const next = useRef(0), timer = useRef(0);
  useFrame((_, dt) => {
    const s = flight.current, r = s.rover;
    const moving = s.deployed && Math.abs(r.speed) > .15;
    const landing = s.phase === 'descent' && s.altitude < 35 && s.throttle > 20;
    timer.current += dt;
    if ((moving || landing) && timer.current > .045) {
      timer.current = 0;
      const p = particles[next.current++ % count];
      const a = next.current * 2.39996;
      p.x = moving ? r.x + Math.cos(r.heading) * (next.current % 2 ? 1 : -1) : Math.sin(a) * 2;
      p.z = moving ? r.z + Math.sin(r.heading) : Math.cos(a) * 2;
      p.y = terrainHeight(p.x, p.z) + .15; p.age = 0;
      p.vx = Math.sin(a) * (landing ? 3 : .3); p.vz = Math.cos(a) * (landing ? 3 : .3);
    }
    particles.forEach((p, i) => {
      p.age = Math.min(1, p.age + dt / 2);
      p.x += (p.vx + .3) * dt; p.z += p.vz * dt; p.y += .1 * dt;
      geometry.attributes.position.setXYZ(i, p.x, p.y, p.z);
      geometry.attributes.age.setX(i, p.age);
    });
    geometry.attributes.position.needsUpdate = true; geometry.attributes.age.needsUpdate = true;
  });
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry} frustumCulled={false}>
    <shaderMaterial transparent depthWrite={false}
      vertexShader={'attribute float age;varying float vAge;void main(){vAge=age;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp((8.+age*16.)*80./max(1.,-p.z),1.,120.); }'}
      fragmentShader={'varying float vAge;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.1,1.,d))*(1.-vAge)*.11;gl_FragColor=vec4(.58,.43,.3,a); }'} />
  </points>;
}
