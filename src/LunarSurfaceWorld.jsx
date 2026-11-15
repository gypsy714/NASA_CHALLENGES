import {useRef,useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import {SURFACE_TARGETS} from './lunarSurface.js';

function SurfaceRover({flight,elevation}){
 const root=useRef(),wheels=useRef(),arm=useRef();
 useFrame(({clock},dt)=>{const s=flight.current,r=s.rover;if(!root.current)return;root.current.visible=r.deployed;root.current.position.set(r.x,elevation(r.x,r.z)+.17,r.z);root.current.rotation.y=r.heading;
  if(wheels.current&&(r.target||Math.hypot(r.input.x,r.input.z)>.1))wheels.current.children.forEach(w=>{w.rotation.x+=dt*6;});
  if(arm.current)arm.current.rotation.x=s.operation?-.65+Math.sin(clock.elapsedTime*3)*.3:-.15;
 });
 return <group ref={root}>
  <mesh castShadow position={[0,.3,0]}><boxGeometry args={[.8,.3,1.05]}/><meshStandardMaterial color="#c8c9bd" metalness={.6} roughness={.45}/></mesh>
  <mesh position={[0,.48,-.1]} castShadow><boxGeometry args={[.95,.035,.74]}/><meshStandardMaterial color="#234c72" metalness={.5} roughness={.35}/></mesh>
  <group ref={wheels}>{[-1,1].flatMap(side=>[-.38,.38].map(z=><group key={`${side}-${z}`} position={[side*.48,.03,z]}><mesh rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.22,.22,.16,20]}/><meshStandardMaterial color="#50534e" metalness={.45} roughness={.8}/></mesh><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.09,.09,.18,12]}/><meshStandardMaterial color="#a9aba6" metalness={.7}/></mesh></group>))}</group>
  <mesh position={[0,.85,.27]} castShadow><cylinderGeometry args={[.018,.018,.7,8]}/><meshStandardMaterial color="#c6c9bc"/></mesh>
  <mesh position={[0,1.2,.29]} castShadow><boxGeometry args={[.26,.13,.15]}/><meshStandardMaterial color="#d1d1c6" metalness={.6}/></mesh>
  <mesh position={[0,1.2,.38]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.045,.045,.04,12]}/><meshStandardMaterial color="#132f43" metalness={.7}/></mesh>
  <group ref={arm} position={[.3,.4,.5]}><mesh position={[0,-.03,.25]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.025,.025,.5,8]}/><meshStandardMaterial color="#bbad7b" metalness={.65}/></mesh><mesh position={[0,-.08,.5]} castShadow><boxGeometry args={[.2,.1,.16]}/><meshStandardMaterial color="#8c938b" metalness={.7}/></mesh></group>
  {flight.current.samples.basalt&&<mesh position={[-.2,.55,-.3]}><dodecahedronGeometry args={[.12,0]}/><meshStandardMaterial color="#484848"/></mesh>}
  {flight.current.samples.regolith&&<mesh position={[.2,.55,-.3]}><cylinderGeometry args={[.1,.1,.2,12]}/><meshStandardMaterial color="#ddd4b5"/></mesh>}
 </group>;
}
function SoilDeposit({elevation,collected}){
 const geometry=useMemo(()=>{
  const g=new THREE.CircleGeometry(1.05,48);g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,elevation(10+x,4+z)+.035);}
  g.computeVertexNormals();return g;
 },[elevation]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group position={[10,0,4]}>
  <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={collected?'#706b61':'#a99b81'} roughness={1} side={THREE.DoubleSide}/></mesh>
  {!collected&&Array.from({length:18},(_,i)=>{const a=i*2.4,r=.12+((i*7)%17)/22,x=Math.cos(a)*r,z=Math.sin(a)*r;return <mesh key={i} position={[x,elevation(10+x,4+z)+.055,z]} scale={[.10+(i%3)*.035,.045+(i%4)*.015,.11]} rotation={[0,a,0]} castShadow receiveShadow><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%2?'#9b907c':'#c0b49b'} roughness={1}/></mesh>;})}
  {collected&&<mesh position={[0,elevation(10,4)+.05,0]} rotation={[-Math.PI/2,0,.4]}><planeGeometry args={[.35,.65]}/><meshStandardMaterial color="#4c4942" roughness={1}/></mesh>}
 </group>;
}
export default function LunarSurfaceWorld({flight,elevation}){
 const s=flight.current,radio=useRef();
 useFrame(({clock})=>{if(radio.current){radio.current.visible=flight.current.phase==='transmitting';radio.current.children.forEach((m,i)=>{const p=(clock.elapsedTime*.7+i/3)%1;m.scale.setScalar(.2+p*2);m.position.y=3.5+p*4;m.material.opacity=(1-p)*.6;});}});
 if(!['landed','transmitting','success'].includes(s.phase))return null;
 return <>
  <SurfaceRover flight={flight} elevation={elevation}/>
  {!s.samples.basalt&&<mesh position={[8,elevation(8,-3)+.26,-3]} scale={[.5,.3,.42]} rotation={[.3,.5,.2]} castShadow receiveShadow><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#3f4143" roughness={.95}/></mesh>}
  <SoilDeposit elevation={elevation} collected={s.samples.regolith}/>
  {s.instrument&&<group position={[5,elevation(5,8),8]}><mesh position={[0,.18,0]} castShadow><boxGeometry args={[.65,.35,.55]}/><meshStandardMaterial color="#c0b991" metalness={.5}/></mesh><mesh position={[0,.42,0]}><cylinderGeometry args={[.22,.28,.12,16]}/><meshStandardMaterial color="#cfd3cd" metalness={.7}/></mesh><mesh position={[.2,.8,0]}><cylinderGeometry args={[.012,.012,1.1,8]}/><meshStandardMaterial color="#babeb5"/></mesh></group>}
  {s.phase==='landed'&&Object.entries(SURFACE_TARGETS).filter(([key])=>key!=='lander').map(([key,t])=><group key={key} position={[t.x,elevation(t.x,t.z)+1.5,t.z]}><Html center distanceFactor={8} style={{pointerEvents:'none'}}><span className={`lm-world-target ${(s.samples[key]||(key==='sensor'&&s.instrument))?'complete':''}`}>{(s.samples[key]||(key==='sensor'&&s.instrument))?'✓ ':''}{t.label}</span></Html><mesh position={[0,-.7,0]}><cylinderGeometry args={[.012,.012,1.2,6]}/><meshBasicMaterial color={key==='regolith'?'#e0c48d':'#91c8ce'}/></mesh></group>)}
  <group ref={radio}>{[0,1,2].map(i=><mesh key={i} position={[0,4,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.7,.015,6,48]}/><meshBasicMaterial color="#a5d7ee" transparent opacity={.4} depthWrite={false}/></mesh>)}</group>
 </>;
}
