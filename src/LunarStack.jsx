import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Rocket,PARTS} from './SpacecraftAssembly';
import {LunarLander} from './LunarVisuals';

export function rocketHeight(build){return build.reduce((h,id)=>h+(PARTS.find(p=>p.id===id)?.h||0),0)+.65;}
function TransferStage({flight,landerBuild}){return <>
 <mesh position={[0,2.3,0]} castShadow><cylinderGeometry args={[.76,.76,4.2,40]}/><meshStandardMaterial color="#d3d9d7" metalness={.6} roughness={.4}/></mesh>
 <mesh position={[0,4.45,0]}><cylinderGeometry args={[.65,.76,.25,32]}/><meshStandardMaterial color="#bca577" metalness={.7}/></mesh>
 <mesh position={[0,-.15,0]}><cylinderGeometry args={[.28,.55,.65,24,1,true]}/><meshStandardMaterial color="#464c50" side={THREE.DoubleSide} metalness={.8}/></mesh>
 <group position={[0,4.7,0]} scale={.55}><LunarLander flight={flight} build={landerBuild}/></group>
</>;}
export default function LunarStack({flight,rocketBuild,landerBuild,cutaway=false,preview=false}){
 const discarded=useRef(),fairingHalves=useRef();
 const f=flight.current,full=preview||['briefing','launch'].includes(f.phase),height=rocketHeight(rocketBuild);
 const coreBuild=rocketBuild.filter(id=>id!=='fairing'&&(!f.boostersSeparated||preview||id!=='booster'));
 useFrame(()=>{const s=flight.current;if(discarded.current){const p=Math.min(1,Math.max(0,(s.launchTime-(s.boosterSeparationTime||48))/12));discarded.current.visible=s.phase==='launch'&&s.boostersSeparated&&p<1;discarded.current.position.y=-p*10;discarded.current.children.forEach((g,i)=>{g.position.x=(i?1:-1)*(1.3+p*4);g.rotation.z=(i?1:-1)*p*.5;});}if(fairingHalves.current){const p=Math.min(1,Math.max(0,(s.launchTime-(s.fairingSeparationTime||60))/10));fairingHalves.current.visible=s.phase==='launch'&&s.fairingSeparated&&p<1;fairingHalves.current.children.forEach((g,i)=>{g.position.set((i?1:-1)*(.05+p*4),-p*3,0);g.rotation.z=(i?1:-1)*p*.6;});}});
 return <group>
  {full?<>
   <Rocket build={coreBuild} selected={null} onSelect={()=>{}}/>
   <group position={[0,height,0]}><TransferStage flight={flight} landerBuild={landerBuild}/></group>
   {rocketBuild.includes('fairing')&&(!f.fairingSeparated||preview)&&<group position={[0,height+5.75,0]}><mesh castShadow><cylinderGeometry args={[.96,.96,2.4,40,1,true]}/><meshStandardMaterial color="#e1e5df" metalness={.42} roughness={.45} transparent={cutaway} opacity={cutaway?.18:1} side={THREE.DoubleSide} depthWrite={!cutaway}/></mesh><mesh position={[0,1.7,0]} castShadow><coneGeometry args={[.96,1,40]}/><meshStandardMaterial color="#d5dcd8" metalness={.4} roughness={.45} transparent={cutaway} opacity={cutaway?.18:1}/></mesh></group>}
   <group ref={discarded} visible={false}>{[-1,1].map(side=><group key={side} position={[side*1.3,3,0]}><mesh castShadow><cylinderGeometry args={[.25,.25,2.4,24]}/><meshStandardMaterial color="#e2e5df" metalness={.5}/></mesh><mesh position={[0,1.3,0]}><coneGeometry args={[.25,.5,20]}/><meshStandardMaterial color="#cacdc8"/></mesh></group>)}</group>
   <group ref={fairingHalves} visible={false} position={[0,height+5.75,0]}>{[0,1].map(i=><group key={i}><mesh><cylinderGeometry args={[.96,.96,2.4,24,1,true,i*Math.PI,Math.PI]}/><meshStandardMaterial color="#dce3de" metalness={.4} roughness={.45} side={THREE.DoubleSide}/></mesh><mesh position={[0,1.7,0]}><coneGeometry args={[.96,1,24,1,false,i*Math.PI,Math.PI]}/><meshStandardMaterial color="#dce3de" side={THREE.DoubleSide}/></mesh></group>)}</group>
  </>:<TransferStage flight={flight} landerBuild={landerBuild}/>}
 </group>;
}
