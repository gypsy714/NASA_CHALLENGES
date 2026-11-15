// AI-assisted world assembly. NASA rover/map and CC0 textures are credited in CREDITS.md.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Center } from '@react-three/drei';
import * as THREE from 'three';
import { scienceSites, terrainHeight } from './marsPhysics.js';
import { MarsRover, EntryCapsule, DescentPlatform, EnginePlume } from './MarsHardware';
import { MarsSurface, MartianSky, MarsDust } from './MarsLandscape';
import { setLayerOpacity } from './earthVisualState.js';
export { MarsRover } from './MarsHardware';

function MarsPlanet({ position = [0,-1100,0], radius = 900 }) {
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load('/mars/mars.jpg');
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={[.3,-.6,.15]}>
    <sphereGeometry args={[radius,96,64]}/><meshStandardMaterial map={texture} roughness={1}/>
  </mesh>;
}
function FlightHardware({ flight,rocket }) {
  const root = useRef();
  const s = flight.current;
  useFrame(() => {
    root.current.position.y = Math.log1p(flight.current.altitude / 50) * 12;
  });
  return <group ref={root}>
    {s.powered ? <><DescentPlatform flight={flight}/>{!s.deployed && <group position={[0,1.1,0]} scale={.72}><MarsRover preview folded configuration={s.configuration}/></group>}</> : <EntryCapsule flight={flight}/>}
    {s.phase==='separation' && rocket && <group position={[s.separationTime*.8,-5-s.separationTime*.6,-s.separationTime*.4]} scale={.7}><Center>{rocket}</Center></group>}
  </group>;
}
function SurfaceLayer({ flight }) {
  const ground = useRef(), planet = useRef();
  useFrame(() => {
    const altitude = flight.current.altitude;
    setLayerOpacity(ground.current, 1 - THREE.MathUtils.smoothstep(altitude, 5000, 20000));
    setLayerOpacity(planet.current, THREE.MathUtils.smoothstep(altitude, 6000, 19000));
  });
  return <>
    <group ref={ground}><MarsSurface/>
      {scienceSites.map(site=><Text key={site.id} position={[site.x,3,site.z]} fontSize={.34} color="#efdfbb" outlineWidth={.016} outlineColor="#32271d">{site.name.toUpperCase()}</Text>)}
      <Text position={[0,.45,12]} rotation={[-Math.PI/2,0,0]} fontSize={.6} color="#e1c58e">RELAY</Text>
    </group>
    <group ref={planet}><MarsPlanet/></group>
  </>;
}
function TransferScene({ flight,rocket,rocketHeight=13.4 }) {
  const craft = useRef();
  const earth = useMemo(() => { const t=new THREE.TextureLoader().load('/textures/earth.jpg');t.colorSpace=THREE.SRGBColorSpace;return t; },[]);
  useEffect(()=>()=>earth.dispose(),[earth]);
  useFrame(()=> { const t=flight.current.days/210;craft.current.position.set(-14+t*28,Math.sin(t*Math.PI)*4,0); });
  const route = flight.current.routeView;
  useFrame(()=> { if(!flight.current.routeView)craft.current.position.set(0,0,0); });
  return <>
    <Stars radius={180} depth={60} count={3500} factor={3} fade/>
    <ambientLight intensity={1}/><directionalLight position={[10,20,15]} intensity={3} color="#fff1d8"/>
    <mesh position={route?[-18,-2,0]:[-40,10,-75]}><sphereGeometry args={[route?3:8,64,48]}/><meshStandardMaterial map={earth} roughness={1}/></mesh>
    <MarsPlanet position={route?[18,-2,0]:[7,-25,-55]} radius={route?2.7:22}/>
    {route && <><Text position={[-18,-6.5,0]} fontSize={.7} color="#bacad1">EARTH</Text>
    <Text position={[18,-6.5,0]} fontSize={.7} color="#d8b38d">MARS</Text></>}
    <group ref={craft} scale={route ? .65 : 1}>{rocket&&<><Center>{rocket}</Center><EnginePlume flight={flight} transfer position={[0,-rocketHeight/2-1.7,0]}/></>}</group>
  </>;
}
function CameraRig({ flight, controls }) {
  const last = useRef(new THREE.Vector3()), initialized = useRef('');
  useFrame(({ camera, clock }, dt) => {
    const s = flight.current;
    const space = ['transfer', 'cruise', 'arrival'].includes(s.phase);
    const surface = ['landed', 'transmitting', 'success'].includes(s.phase);
    const key = space ? `space${s.routeView?'route':'craft'}` : surface ? `surface${s.camera}` : s.chute ? 'parachute' : s.powered ? 'descent' : 'entry';
    const r = s.rover;
    const target = space ? new THREE.Vector3(0, 0, 0) : surface && s.deployed
      ? new THREE.Vector3(r.x, terrainHeight(r.x, r.z) + 1, r.z)
      : new THREE.Vector3(0, Math.log1p(s.altitude / 50) * 12 + (s.chute ? 8 : 1.4), 0);
    if (key !== initialized.current) {
      camera.position.copy(target).add(space ? s.routeView ? new THREE.Vector3(0, 15, 47) : new THREE.Vector3(13, 7, 20) : s.camera === 1 && surface ? new THREE.Vector3(0, 13, 1) : s.chute ? new THREE.Vector3(19, 9, 23) : new THREE.Vector3(8, 4, 11));
      last.current.copy(target); initialized.current = key;
    }
    const delta = target.clone().sub(last.current);
    camera.position.add(delta); last.current.copy(target);
    if (controls.current) {
      controls.current.target.copy(target);
      controls.current.enablePan = false;
      controls.current.minDistance = space ? s.routeView ? 20 : 9 : 3;
      controls.current.maxDistance = space ? 90 : 38;
      controls.current.maxPolarAngle = Math.PI * .48;
      controls.current.update();
    }
    if (!surface && !space) {
      camera.position.x += Math.sin(clock.elapsedTime * 29) * s.shake * Math.min(dt * 60, 1);
      camera.position.y += Math.cos(clock.elapsedTime * 33) * s.shake * Math.min(dt * 60, 1);
    }
  });
  return null;
}
function PhotoCapture({ request, onPhoto }) {
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    if (!request.current) return;
    request.current = false;
    try {
      gl.render(scene, camera);
      const image = document.createElement('canvas');
      image.width = gl.domElement.width; image.height = gl.domElement.height;
      const context = image.getContext('2d');
      context.drawImage(gl.domElement, 0, 0);
      const size = Math.max(13, Math.round(image.width / 70));
      context.fillStyle = '#101c25cc'; context.fillRect(0, image.height - size * 2.7, image.width, size * 2.7);
      context.fillStyle = '#eee0c6'; context.font = `${size}px Arial`;
      context.fillText('BEYOND EARTH / AI-assisted simulation visuals', size, image.height - size);
      onPhoto(image.toDataURL('image/png'));
    }
    catch { onPhoto(null); }
  });
  return null;
}
export default function MarsWorld({ flight, snapshot, capture, onPhoto,rocket,rocketHeight }) {
  const controls=useRef();
  const space=['transfer','cruise','arrival'].includes(snapshot.phase);
  return <>
    <color attach="background" args={['#030710']}/>
    {space ? <TransferScene flight={flight} rocket={rocket} rocketHeight={rocketHeight}/> : <>
      <fog attach="fog" args={['#a99076',125,430]}/>
      <MartianSky flight={flight}/>
      <hemisphereLight args={['#dfd2bd','#72543d',2.1]}/>
      <directionalLight position={[-60,26,-70]} color="#ffe2b6" intensity={2.1} castShadow
        shadow-mapSize={[2048,2048]} shadow-camera-left={-38} shadow-camera-right={38}
        shadow-camera-top={38} shadow-camera-bottom={-38} shadow-camera-far={220} shadow-bias={-.0003}/>
      <SurfaceLayer flight={flight}/><FlightHardware flight={flight} rocket={rocket}/><MarsDust flight={flight}/>
      {snapshot.deployed && <MarsRover state={flight}/>}
      {snapshot.heat>3 && <pointLight position={[0,Math.log1p(snapshot.altitude/50)*12-.5,0]} color="#ff762e" intensity={snapshot.heat*3} distance={24}/>}
    </>}
    <OrbitControls ref={controls} enableDamping dampingFactor={.09}/>
    <CameraRig flight={flight} controls={controls}/>
    <PhotoCapture request={capture} onPhoto={onPhoto}/>
  </>;
}
