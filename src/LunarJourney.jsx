import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useTexture,Line} from '@react-three/drei';
import * as THREE from 'three';
import LunarStack from './LunarStack';

export default function LunarJourney({flight,build,architecture}){
 const craft=useRef(),flame=useRef(),earth=useRef(),moon=useRef(),ground=useRef(),look=useRef(new THREE.Vector3());
 const [earthMap,clouds,moonMap]=useTexture(['/earth-observation.jpg','/earth-clouds.png','/moon-color.jpg']);
 earthMap.colorSpace=clouds.colorSpace=moonMap.colorSpace=THREE.SRGBColorSpace;
 useFrame(({camera,scene},dt)=>{
  const s=flight.current,launch=s.phase==='launch',p=s.transferTime/s.transferDuration;
  ground.current.visible=launch;earth.current.visible=!launch;moon.current.visible=!launch;
  flame.current.visible=launch&&s.launchTime>=3;
  if(launch){const h=Math.min(100,s.altitude*.0006);craft.current.position.set(0,h+1,0);craft.current.rotation.set(0,0,0);camera.position.lerp(new THREE.Vector3(16,h+13,28),1-Math.exp(-dt*4));look.current.lerp(new THREE.Vector3(0,h+8.5,0),1-Math.exp(-dt*4));scene.background=new THREE.Color('#6e9bb7').lerp(new THREE.Color('#02040a'),Math.min(1,s.altitude/55000));}
  else{scene.background=new THREE.Color('#02040a');earth.current.position.set(-36,0,0);moon.current.position.set(36,0,0);craft.current.position.set(-25+56*p,5+Math.sin(p*Math.PI)*12,1);craft.current.rotation.z=-Math.PI/2+Math.cos(p*Math.PI)*.12;camera.position.lerp(new THREE.Vector3(0,24,112),1-Math.exp(-dt*3));look.current.lerp(new THREE.Vector3(0,3,0),1-Math.exp(-dt*3));}
  camera.lookAt(look.current);
 });
 const route=Array.from({length:70},(_,i)=>{const p=i/69;return [-25+56*p,5+Math.sin(p*Math.PI)*12,0];});
 return <>
  <ambientLight intensity={.6}/><directionalLight position={[50,40,70]} intensity={3.3}/>
  <group ref={earth}><mesh><sphereGeometry args={[9,64,48]}/><meshStandardMaterial map={earthMap} roughness={1}/></mesh><mesh><sphereGeometry args={[9.05,64,48]}/><meshStandardMaterial map={clouds} transparent opacity={.5}/></mesh></group>
  <group ref={moon}><mesh><sphereGeometry args={[3.3,64,48]}/><meshStandardMaterial map={moonMap} roughness={1}/></mesh></group>
  {flight.current.phase!=='launch'&&<Line points={route} color="#79aab9" lineWidth={1} dashed dashScale={2} dashSize={.4} gapSize={.3}/>}
  <group ref={craft} scale={.65}>
   <LunarStack flight={flight} rocketBuild={architecture.rocketBuild} landerBuild={build}/>
   <mesh ref={flame} position={[0,-3,0]} rotation={[Math.PI,0,0]}><coneGeometry args={[.65,5.5,24]}/><meshBasicMaterial color="#ffca8a" transparent opacity={.8}/></mesh>
  </group>
  <group ref={ground}><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.1,0]}><planeGeometry args={[1200,1200]}/><meshStandardMaterial color="#52665b" roughness={1}/></mesh><mesh position={[0,.2,0]}><cylinderGeometry args={[5.5,5.5,.5,48]}/><meshStandardMaterial color="#7a7c78"/></mesh><mesh position={[-5,6,0]}><boxGeometry args={[.6,12,.8]}/><meshStandardMaterial color="#9b9f9b" metalness={.6}/></mesh></group>
 </>;
}
