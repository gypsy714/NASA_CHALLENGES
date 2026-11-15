import { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Edges } from '@react-three/drei';
import * as THREE from 'three';
import './SpacecraftAssembly.css';
import LaunchPreparation from './LaunchPreparation';
import LunarMission from './LunarMission';
import LunarAssembly from './LunarAssembly';
import MarsAssembly from './MarsAssembly';
import {PAYLOAD_PART_IDS} from './marsConfiguration.js';
import { MarsRover, DescentPlatform } from './MarsHardware';
import {LunarLander} from './LunarVisuals';

export const PARTS = [
  {id:'heavyEngine',name:'Heavy-Lift Engine',category:'Engines',type:'engine',mass:6,thrust:1800,cost:8200,h:1.6,tags:['propulsion']},
  {id:'capsule',name:'Crew Command Pod',category:'Command',type:'capsule',mass:2.2,cost:1800,h:1.05,tags:['command','crew']},
  {id:'probe',name:'Autonomous Probe Core',category:'Command',type:'probe',mass:.35,cost:850,h:.48,tags:['command']},
  {id:'smallTank',name:'FL-T200 Tank',category:'Fuel Tanks',type:'tank',mass:1.1,fuel:90,cost:550,h:1.15,tags:['fuel']},
  {id:'mediumTank',name:'FL-T400 Tank',category:'Fuel Tanks',type:'tank',mass:2.1,fuel:180,cost:950,h:1.85,tags:['fuel']},
  {id:'largeTank',name:'FL-T800 Tank',category:'Fuel Tanks',type:'tank',mass:4.2,fuel:360,cost:1600,h:2.75,tags:['fuel']},
  {id:'cryoTank',name:'Cryogenic Tank',category:'Fuel Tanks',type:'tank',mass:3.6,fuel:430,cost:2400,h:2.5,tags:['fuel']},
  {id:'engine',name:'LV-T45 Engine',category:'Engines',type:'engine',mass:1.5,thrust:215,cost:1200,h:.95,tags:['propulsion']},
  {id:'vacEngine',name:'Vacuum Engine',category:'Engines',type:'vacEngine',mass:.9,thrust:70,cost:1800,h:1.18,tags:['propulsion']},
  {id:'ionEngine',name:'Ion Thruster',category:'Engines',type:'ionEngine',mass:.4,thrust:3,cost:3200,h:.65,tags:['propulsion']},
  {id:'booster',name:'Solid Booster Pair',category:'Boosters',type:'booster',mass:3.2,thrust:420,cost:2300,h:0,tags:['propulsion','booster']},
  {id:'fin',name:'Stabilizer Fins ×4',category:'Aerodynamics',type:'fins',mass:.4,cost:300,h:0,tags:['stability']},
  {id:'fairing',name:'Payload Fairing',category:'Aerodynamics',type:'fairing',mass:.45,cost:650,h:0,tags:['fairing']},
  {id:'decoupler',name:'Stack Decoupler',category:'Structural',type:'decoupler',mass:.12,cost:400,h:.25,tags:['staging']},
  {id:'battery',name:'Battery Pack',category:'Electrical',type:'battery',mass:.22,cost:450,h:0,tags:['power']},
  {id:'solar',name:'Solar Panel Pair',category:'Electrical',type:'solar',mass:.38,cost:1250,h:0,tags:['power','solar']},
  {id:'antenna',name:'Communications Dish',category:'Communication',type:'antenna',mass:.3,cost:900,h:0,tags:['communication']},
  {id:'deepAntenna',name:'Deep Space Antenna',category:'Communication',type:'antenna',mass:.65,cost:1900,h:0,tags:['communication','deepcomm']},
  {id:'reaction',name:'Reaction Wheel',category:'Control',type:'reaction',mass:.28,cost:800,h:.32,tags:['control']},
  {id:'rcs',name:'RCS Thruster Set',category:'Control',type:'rcs',mass:.35,cost:900,h:0,tags:['control']},
  {id:'parachute',name:'Recovery Parachute',category:'Safety',type:'parachute',mass:.18,cost:400,h:0,tags:['parachute']},
  {id:'shield',name:'Thermal Heat Shield',category:'Safety',type:'shield',mass:.8,cost:1150,h:.23,tags:['heatshield']},
  {id:'legs',name:'Landing Leg Set',category:'Landing',type:'legs',mass:.9,cost:1200,h:0,tags:['landing']},
  {id:'camera',name:'Science Imaging Camera',category:'Science',type:'camera',mass:.24,cost:1500,h:0,tags:['camera','science']},
  {id:'science',name:'Science Instrument Bay',category:'Science',type:'science',mass:.55,cost:1800,h:.45,tags:['science','seismic']},
  {id:'rover',name:'Six-Wheel Science Rover',category:'Science',type:'rover',mass:1.1,cost:3500,h:.65,tags:['rover','science']},
];
const CATEGORIES = ['All','Command','Fuel Tanks','Engines','Boosters','Aerodynamics','Structural','Electrical','Communication','Control','Safety','Landing','Science'];
const LUNAR_BUILD=['probe','cryoTank','cryoTank','cryoTank','cryoTank','vacEngine','legs','battery','solar','deepAntenna','reaction','science','rover','camera'];
const LUNAR_PARTS=new Set(['probe','capsule','smallTank','mediumTank','largeTank','cryoTank','engine','vacEngine','ionEngine','battery','solar','antenna','deepAntenna','reaction','rcs','legs','camera','science','rover']);
const DEFAULT_BUILD = ['capsule','mediumTank','largeTank','engine','fin'];
// AI-assisted Mars integration. Descent package remains inside the launch aeroshell.
const MARS_BUILD = ['probe','reaction','rover','science','shield','cryoTank','cryoTank','cryoTank','heavyEngine','camera','legs','parachute','battery','solar','deepAntenna','fairing'];
const byId = id => PARTS.find(p=>p.id===id);
const isEngine = p => ['engine','vacEngine','ionEngine'].includes(p?.type);
const isAxial = p => (p?.h||0)>0;
const MISSION_DATA = {
 earth:{name:'EARTH OBSERVATION',destination:'LOW EARTH ORBIT',objective:'Deploy an imaging satellite and transmit observations.',checks:[
  ['command','Flight computer / command module'],['propulsion','Propulsion system'],['fuel','Fuel tank'],['power','Electrical power'],['communication','Communications'],['camera','Earth imaging camera']]},
 moon:{name:'LUNAR EXPLORATION',destination:'MOON SURFACE',objective:'Deliver an uncrewed lunar lander to the surface.',checks:[
  ['command','Flight computer / command module'],['propulsion','Propulsion system'],['fuel','Fuel tank'],['power','Electrical power'],['communication','Communications'],['landing','Landing legs'],['control','Attitude control'],['solar','Solar array for transfer'],['seismic','Seismic instrument bay'],['rover','Surface exploration rover'],['camera','Surface observation camera']]},
 mars:{name:'MARS EXPLORATION',destination:'MARS SURFACE',objective:'Deliver a robotic science payload to Mars.',checks:[
  ['command','Flight computer / command module'],['propulsion','Propulsion system'],['fuel','Fuel tank'],['power','Electrical power'],['deepcomm','Deep-space communications'],['heatshield','Entry heat shield'],['parachute','Descent parachute'],['landing','Landing legs / powered descent package'],['rover','Exploration rover'],['camera','Landscape camera'],['science','Rock scanner and sample arm'],['control','Attitude control']]}
};
function PartModel({part}) {
  if(part.type==='rover') return <group scale={.35}><MarsRover preview /></group>;
  const white={color:'#dce3e6',metalness:.7,roughness:.27};
  const dark={color:'#27333c',metalness:.8,roughness:.29};
  const steel={color:'#71818b',metalness:.9,roughness:.24};
  if(part.type==='capsule') return <group>
    <mesh position={[0,-.06,0]}><cylinderGeometry args={[.24,.57,.82,32]}/><meshStandardMaterial {...white}/></mesh>
    <mesh position={[0,.39,0]}><cylinderGeometry args={[.21,.25,.12,32]}/><meshStandardMaterial {...dark}/></mesh>
    <mesh position={[0,-.06,.48]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[.15,32]}/><meshStandardMaterial color="#18384a" metalness={.8} roughness={.08}/></mesh>
    <mesh position={[0,-.49,0]}><cylinderGeometry args={[.58,.58,.08,32]}/><meshStandardMaterial {...dark}/></mesh>
  </group>;
  if(part.type==='probe') return <group>
    <mesh><cylinderGeometry args={[.42,.42,.39,8]}/><meshStandardMaterial {...white}/></mesh>
    <mesh position={[0,.2,0]}><cylinderGeometry args={[.35,.35,.07,8]}/><meshStandardMaterial {...dark}/></mesh>
    <mesh position={[0,-.2,0]}><cylinderGeometry args={[.43,.43,.06,8]}/><meshStandardMaterial {...steel}/></mesh>
    {[0,Math.PI/2,Math.PI,Math.PI*1.5].map(a=><mesh key={a} position={[Math.sin(a)*.43,0,Math.cos(a)*.43]} rotation={[0,a,0]}><boxGeometry args={[.22,.17,.035]}/><meshStandardMaterial color="#1d4258" metalness={.65}/></mesh>)}
  </group>;
  if(part.type==='tank') return <group>
    <mesh><cylinderGeometry args={[.56,.56,part.h,48]}/><meshStandardMaterial {...white}/></mesh>
    {[-1,1].map(s=><mesh key={s} position={[0,s*(part.h/2-.085),0]}><cylinderGeometry args={[.577,.577,.16,48]}/><meshStandardMaterial {...dark}/></mesh>)}
    <mesh position={[0,0,.563]}><boxGeometry args={[.11,Math.max(.2,part.h-.45),.014]}/><meshStandardMaterial color="#c46b37" metalness={.4}/></mesh>
    <mesh position={[0,0,-.563]}><boxGeometry args={[.11,Math.max(.2,part.h-.45),.014]}/><meshStandardMaterial color="#c46b37" metalness={.4}/></mesh>
    <mesh position={[0,0,.572]}><boxGeometry args={[.34,.19,.016]}/><meshStandardMaterial color="#283943"/></mesh>
  </group>;
  if(isEngine(part)) return <group>
    <mesh position={[0,.31,0]}><cylinderGeometry args={[.36,.38,.3,32]}/><meshStandardMaterial {...steel}/></mesh>
    <mesh position={[0,.05,0]}><cylinderGeometry args={[.24,.29,.3,32]}/><meshStandardMaterial {...dark}/></mesh>
    <mesh position={[0,-.28,0]}><cylinderGeometry args={[.21,part.type==='vacEngine'?.57:part.type==='ionEngine'?.32:.46,part.type==='vacEngine'?.82:part.type==='ionEngine'?.42:.56,48,1,true]}/><meshStandardMaterial color="#5b6872" metalness={.94} roughness={.23} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0,part.type==='vacEngine'?-.69:-.56,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[part.type==='vacEngine'?.57:part.type==='ionEngine'?.32:.46,.035,10,48]}/><meshStandardMaterial color="#c4a77a" metalness={.9}/></mesh>
  </group>;
  if(part.type==='fins') return <group>{[0,Math.PI/2,Math.PI,Math.PI*1.5].map(a=><group key={a} rotation={[0,a,0]}>
    <mesh position={[.84,0,0]}><boxGeometry args={[.85,.92,.085]}/><meshStandardMaterial {...white}/></mesh>
    <mesh position={[1.15,-.2,0]}><boxGeometry args={[.14,.5,.1]}/><meshStandardMaterial color="#b85f36" metalness={.5}/></mesh>
  </group>)}</group>;
  if(part.type==='booster') return <group>{[-1,1].map(side=><group key={side} position={[side*.95,0,0]}>
    <mesh><cylinderGeometry args={[.25,.25,2.4,24]}/><meshStandardMaterial {...white}/></mesh>
    <mesh position={[0,1.28,0]}><coneGeometry args={[.25,.55,24]}/><meshStandardMaterial color="#c8d3d8"/></mesh>
    <mesh position={[0,-1.35,0]}><cylinderGeometry args={[.15,.35,.35,24]}/><meshStandardMaterial {...steel}/></mesh>
    <mesh position={[0,0,.255]}><boxGeometry args={[.16,1.8,.025]}/><meshStandardMaterial color="#c76b37"/></mesh>
  </group>)}</group>;
  if(part.type==='solar') return <group>{[-1,1].map(side=><group key={side} position={[side*1.15,0,0]}>
    <mesh><boxGeometry args={[1.6,.62,.06]}/><meshStandardMaterial color="#163b66" metalness={.6}/></mesh>
    {[-.52,0,.52].map(x=><mesh key={x} position={[x,0,.04]}><boxGeometry args={[.035,.61,.01]}/><meshBasicMaterial color="#91b8d0"/></mesh>)}
    <mesh position={[-side*.9,0,0]}><boxGeometry args={[.4,.09,.09]}/><meshStandardMaterial {...steel}/></mesh>
  </group>)}</group>;
  if(part.type==='antenna') return <group position={[.7,.3,0]}>
    <mesh position={[0,.5,0]}><cylinderGeometry args={[.035,.035,1.05,12]}/><meshStandardMaterial {...steel}/></mesh>
    <mesh position={[0,1,0]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[part.id==='deepAntenna'?.68:.45,.24,32]}/><meshStandardMaterial color="#a4b6bf" metalness={.8} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0,1.12,0]}><sphereGeometry args={[.09,12,12]}/><meshStandardMaterial color="#63c6ef" emissive="#19638b"/></mesh>
  </group>;
  if(part.type==='legs') return <group>{[0,Math.PI/2,Math.PI,Math.PI*1.5].map(a=><group key={a} rotation={[0,a,0]}>
    <mesh position={[.8,-.35,0]} rotation={[0,0,.35]}><boxGeometry args={[.08,1.35,.12]}/><meshStandardMaterial {...steel}/></mesh>
    <mesh position={[1.05,-1.03,0]}><boxGeometry args={[.55,.07,.34]}/><meshStandardMaterial color="#b4b9b4" metalness={.7}/></mesh>
  </group>)}</group>;
  if(part.type==='parachute') return <group>
    <mesh position={[0,.15,0]}><sphereGeometry args={[.44,24,16,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#e3e6dc"/></mesh>
    <mesh position={[0,-.08,0]}><cylinderGeometry args={[.38,.38,.16,24]}/><meshStandardMaterial {...dark}/></mesh>
  </group>;
  if(part.type==='camera'||part.type==='science'||part.type==='rover') return <group>
    <mesh><boxGeometry args={[.7,.5,.65]}/><meshStandardMaterial {...white}/></mesh>
    <mesh position={[0,0,.34]}><cylinderGeometry args={[.21,.21,.12,24]}/><meshStandardMaterial color="#172c3c" metalness={.8}/></mesh>
    <mesh position={[0,0,.41]}><circleGeometry args={[.14,24]}/><meshBasicMaterial color="#2c83a9"/></mesh>
  </group>;
  if(part.type==='fairing') return <mesh><coneGeometry args={[.69,1.1,32]}/><meshStandardMaterial color="#e2e8eb" metalness={.45}/></mesh>;
  if(part.type==='battery'||part.type==='reaction'||part.type==='rcs') return <group>
    <mesh><boxGeometry args={[.65,.42,.66]}/><meshStandardMaterial {...steel}/></mesh>
    <mesh position={[0,0,.35]}><boxGeometry args={[.43,.26,.04]}/><meshStandardMaterial color="#1d4358"/></mesh>
  </group>;
  if(part.type==='shield') return <mesh><cylinderGeometry args={[.6,.6,.22,40]}/><meshStandardMaterial color="#6c4431" metalness={.2} roughness={.9}/></mesh>;
  return <group>
    <mesh><cylinderGeometry args={[.59,.59,.23,40]}/><meshStandardMaterial color="#c3a86e" metalness={.75} roughness={.3}/></mesh>
    <mesh position={[0,.12,0]}><cylinderGeometry args={[.48,.48,.045,40]}/><meshStandardMaterial {...dark}/></mesh>
    <mesh position={[0,-.12,0]}><cylinderGeometry args={[.48,.48,.045,40]}/><meshStandardMaterial {...dark}/></mesh>
  </group>;
}

function buildLayout(build){
  const axial=build.map((id,index)=>({part:byId(id),index})).filter(x=>x.part&&isAxial(x.part));
  const total=axial.reduce((sum,x)=>sum+x.part.h,0);
  let top=total/2;
  const placed=axial.map(x=>{const y=top-x.part.h/2;top-=x.part.h;return {...x,y};});
  const tank=placed.filter(x=>x.part.type==='tank').at(-1);
  return {placed,total,attachY:tank?tank.y:0};
}
export function Rocket({build,selected,onSelect,mars=false,assembly=false,configuration}){
  if(mars) return <MarsLaunchStack build={build} selected={selected} onSelect={onSelect} assembly={assembly} configuration={configuration}/>;
  return <StandardRocket build={build} selected={selected} onSelect={onSelect}/>;
}
function MarsLaunchStack({build,selected,onSelect,assembly,configuration}) {
  const payloadPreview=useRef({phase:'ready',configuration,throttle:0,fuel:0,altitude:0});
  payloadPreview.current.configuration=configuration;
  const tanks=build.map((id,index)=>({part:byId(id),index})).filter(item=>item.part?.type==='tank');
  const engineIndex=build.findIndex(id=>isEngine(byId(id)));
  const controller=build.find(id=>byId(id)?.category==='Command');
  let y=1.6;
  const placed=tanks.map(item=>{const position=y+item.part.h/2;y+=item.part.h;return {...item,y:position};});
  const payload=y+.3;
  const choose=(id)=>event=>{event.stopPropagation();const index=build.indexOf(id);if(index>=0)onSelect(index);};
  return <group>
    {engineIndex>=0&&<group position={[0,.8,0]} scale={[1.7,1,1.7]} onClick={choose(build[engineIndex])}><PartModel part={byId(build[engineIndex])}/></group>}
    {placed.map(item=><group key={item.index} position={[0,item.y,0]} scale={[1.7,1,1.7]} onClick={event=>{event.stopPropagation();onSelect(item.index);}}><PartModel part={item.part}/>{selected===item.index&&<mesh><cylinderGeometry args={[.64,.64,item.part.h,32]}/><meshBasicMaterial color="#69d6ff" transparent opacity={.2}/></mesh>}</group>)}
    <mesh position={[0,payload,0]} castShadow><cylinderGeometry args={[1.45,.98,.5,48]}/><meshStandardMaterial color="#a58c55" metalness={.7} roughness={.5}/></mesh>
    {build.includes('shield')&&<mesh position={[0,payload+.32,0]} onClick={choose('shield')}><cylinderGeometry args={[1.35,1.42,.15,48]}/><meshStandardMaterial color="#5a4130" roughness={.9}/></mesh>}
    {build.includes('rover')&&<>
      <group position={[0,payload+.45,0]} scale={.45}><DescentPlatform flight={payloadPreview} configuration={configuration} stowed/></group>
      <group position={[0,payload+.95,0]} scale={.55} onClick={choose('rover')}><MarsRover preview folded configuration={configuration}/></group>
    </>}
    {controller&&<group position={[.7,payload+.65,-.7]} scale={.45} onClick={choose(controller)}><PartModel part={byId(controller)}/></group>}
    {build.includes('booster')&&<group position={[0,3.1,0]} scale={[1.5,1.3,1.5]} onClick={choose('booster')}><PartModel part={byId('booster')}/></group>}
    {build.includes('fin')&&<group position={[0,2,0]} scale={1.6} onClick={choose('fin')}><PartModel part={byId('fin')}/></group>}
    {build.includes('decoupler')&&<group position={[0,payload-.36,0]} scale={[1.8,1,1.8]} onClick={choose('decoupler')}><PartModel part={byId('decoupler')}/></group>}
    {build.includes('fairing')&&<group onClick={choose('fairing')}>
      <mesh position={[0,payload+1.45,0]} castShadow><cylinderGeometry args={[1.48,1.48,2.8,48,1,true,assembly?Math.PI/2:0,assembly?Math.PI:Math.PI*2]}/><meshStandardMaterial color="#d6d8cf" metalness={.25} roughness={.65} side={THREE.DoubleSide}/></mesh>
      <mesh position={[0,payload+3.38,0]} castShadow><coneGeometry args={[1.48,1.15,48]}/><meshStandardMaterial color="#d6d8cf" metalness={.25} roughness={.65}/></mesh>
      <mesh position={[0,payload+.12,0]}><cylinderGeometry args={[1.5,1.5,.09,48]}/><meshStandardMaterial color="#515b5e" metalness={.8} roughness={.4}/></mesh>
    </group>}
    {Array.from({length:configuration?.cruiseTank||0},(_,i)=><mesh key={`reserve-${i}`} position={[0,payload-.55-i*.2,0]}><cylinderGeometry args={[1.02,1.02,.16,48]}/><meshStandardMaterial color='#ab925b' metalness={.7} roughness={.5}/></mesh>)}
    {build.includes('solar')&&[-1,1].map(side=><mesh key={side} position={[side*1.05,payload-1,0]}><boxGeometry args={[.08,1.6,.8]}/><meshStandardMaterial color="#253e5b" metalness={.7} roughness={.35}/></mesh>)}
  </group>;
}
function StandardRocket({build,selected,onSelect}){
  const {placed,total,attachY}=buildLayout(build);
  const axialIds=new Set(placed.map(x=>x.index));
  const extras=build.map((id,index)=>({part:byId(id),index})).filter(x=>x.part&&!axialIds.has(x.index));
  return <group position={[0,Math.max(1.9,total/2+.35),0]}>
    {placed.map(({part,index,y})=><group key={index} position={[0,y,0]} onClick={e=>{e.stopPropagation();onSelect(index);}}>
      <PartModel part={part}/>
      {selected===index&&<mesh><cylinderGeometry args={[.68,.68,part.h+.06,32]}/><meshBasicMaterial color="#5dd7ff" transparent opacity={.15} depthWrite={false}/></mesh>}
    </group>)}
    {extras.map(({part,index})=><group key={index} position={[0,attachY,0]} onClick={e=>{e.stopPropagation();onSelect(index);}}>
      <PartModel part={part}/>
      {selected===index&&<mesh><sphereGeometry args={[1.5,20,16]}/><meshBasicMaterial color="#5dd7ff" transparent opacity={.09} depthWrite={false}/></mesh>}
    </group>)}
  </group>;
}
export function Hangar(){
  const orange='#9a612a', metal='#59626a';
  const xs=[-11,-7,-3,1,5,9,13];
  return <group>
    <color attach="background" args={['#171c20']}/><fog attach="fog" args={['#171c20',25,65]}/>
    <ambientLight intensity={.85}/><hemisphereLight args={['#c5d3e3','#313338',1.5]}/>
    <directionalLight position={[5,17,7]} intensity={2.5}/>
    {[-8,0,8].map(x=><pointLight key={x} position={[x,12,3]} color="#fff1c8" intensity={75} distance={19}/>)}
    <mesh position={[0,-.14,0]} receiveShadow><boxGeometry args={[29,.28,29]}/><meshStandardMaterial color="#343c3f" roughness={.94}/></mesh>
    <Grid position={[0,.015,0]} args={[29,29]} cellSize={1} cellThickness={.35} cellColor="#586369" sectionSize={5} sectionThickness={.9} sectionColor="#807449" fadeDistance={37}/>
    <mesh position={[0,9,-13]}><boxGeometry args={[29,18,.25]}/><meshStandardMaterial color="#34383b" roughness={.85}/></mesh>
    {[-13,13].map(x=><mesh key={x} position={[x,9,0]}><boxGeometry args={[.25,18,28]}/><meshStandardMaterial color="#393f43"/></mesh>)}
    {xs.map(x=><group key={x}>
      <mesh position={[x,9,-12.7]}><boxGeometry args={[.3,18,.45]}/><meshStandardMaterial color={orange} metalness={.6}/></mesh>
      <mesh position={[x,9,12.7]}><boxGeometry args={[.3,18,.45]}/><meshStandardMaterial color={orange} metalness={.6}/></mesh>
      {[2,5,8,11,14,17].map(y=><group key={y}>
        <mesh position={[x,y,-12.5]} rotation={[0,0,.5]}><boxGeometry args={[.095,3.5,.12]}/><meshStandardMaterial color={metal} metalness={.8}/></mesh>
        <mesh position={[x,y,12.5]} rotation={[0,0,-.5]}><boxGeometry args={[.095,3.5,.12]}/><meshStandardMaterial color={metal} metalness={.8}/></mesh>
      </group>)}
    </group>)}
    {[3,6,9,12,15,18].map(y=><group key={y}>
      <mesh position={[0,y,-12.35]}><boxGeometry args={[29,.17,.35]}/><meshStandardMaterial color="#737b7d" metalness={.75}/></mesh>
      <mesh position={[0,y,12.35]}><boxGeometry args={[29,.17,.35]}/><meshStandardMaterial color="#737b7d" metalness={.75}/></mesh>
    </group>)}
    {[-12.5,12.5].map(x=><group key={x}>
      {[-10,-5,0,5,10].map(z=><mesh key={z} position={[x,9,z]}><boxGeometry args={[.3,18,.32]}/><meshStandardMaterial color={orange} metalness={.6}/></mesh>)}
      {[4,8,12,16].map(y=><mesh key={y} position={[x,y,0]}><boxGeometry args={[.3,.17,28]}/><meshStandardMaterial color={metal} metalness={.7}/></mesh>)}
    </group>)}
    <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[2.2,2.28,64]}/><meshBasicMaterial color="#e4b744" side={THREE.DoubleSide}/></mesh>
    {[-3.7,3.7].map(x=><mesh key={x} position={[x,.026,0]}><boxGeometry args={[.12,.02,11]}/><meshBasicMaterial color="#d8b75c"/></mesh>)}
    {[-1,1].map(s=><group key={s} position={[s*3.5,0,0]}>
      <mesh position={[0,2.5,0]}><boxGeometry args={[.18,5,.2]}/><meshStandardMaterial color="#858b8c" metalness={.8}/></mesh>
      {[.8,1.6,2.4,3.2,4].map(y=><mesh key={y} position={[0,y,0]}><boxGeometry args={[.7,.09,.35]}/><meshStandardMaterial color="#a6aa9e" metalness={.7}/></mesh>)}
      <mesh position={[0,5,0]}><boxGeometry args={[1.1,.18,1.2]}/><meshStandardMaterial color="#a36c31" metalness={.6}/></mesh>
    </group>)}
    {[-7,0,7].map(x=><group key={x} position={[x,16,0]}>
      <mesh><boxGeometry args={[2.5,.18,.7]}/><meshStandardMaterial color="#b7bab1" emissive="#d6e5e9" emissiveIntensity={.7}/></mesh>
    </group>)}
    <Text position={[0,15.2,-12.15]} fontSize={.68} color="#d4c9a5" anchorX="center">VEHICLE ASSEMBLY BUILDING</Text>
  </group>;
}
function Scene({build,selected,onSelect,lunar=false,mars=false}){
  const preview=useRef({pitch:0,legs:true,solar:true,engine:false,fuel:0,throttle:0});
  const height=buildLayout(build).total+(mars?3:0);
  const center=Math.max(3,height/2+(mars?-.6:.35));
  return <Canvas shadows camera={{position:lunar?[7,4.5,10]:mars?[7,center+1.5,12]:[10,center+3,Math.max(18,height*1.6)],fov:mars?65:45,near:.1,far:125}} gl={{antialias:true}}>
    <Hangar/>{lunar?<LunarLander flight={preview} build={build} assembly onSelect={onSelect}/>:<Rocket mars={mars} assembly build={build} selected={selected} onSelect={onSelect}/>}
    <OrbitControls target={[0,lunar?1.8:center,0]} minDistance={5} maxDistance={45} maxPolarAngle={Math.PI/2.04} enableDamping/>
  </Canvas>;
}
export function Thumbnail({part}) {
  if (part.type === 'rover') return <div className="vab-thumb">
    <Canvas camera={{position:[4,3,5],fov:40}}>
      <ambientLight intensity={2}/>
      <directionalLight position={[5,8,5]} intensity={3}/>
      <MarsRover preview/>
    </Canvas>
  </div>;
  const metal = '#dce3e6';
  const dark = '#27333c';
  const type = part.type;
  const isTank = type === 'tank';
  const isMotor = ['engine', 'vacEngine', 'ionEngine'].includes(type);
  return (
    <div className="vab-thumb" style={{display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
      <svg viewBox="0 0 100 90" width="100%" height="100%" aria-hidden="true" style={{maxWidth:100,maxHeight:90}}>
        <defs>
          <linearGradient id={`thumb-${part.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#71818b"/>
            <stop offset=".46" stopColor={metal}/>
            <stop offset="1" stopColor="#6e7e88"/>
          </linearGradient>
        </defs>
        {isTank ? <g>
          <rect x="34" y="12" width="32" height="66" rx="3" fill={`url(#thumb-${part.id})`}/>
          <rect x="33" y="15" width="34" height="8" rx="2" fill={dark}/>
          <rect x="33" y="68" width="34" height="8" rx="2" fill={dark}/>
          <rect x="48" y="25" width="4" height="41" fill="#c46b37"/>
        </g> : null}
        {type === 'capsule' ? <g><path d="M30 71 L33 43 L44 16 Q50 8 56 16 L67 43 L70 71Z" fill={`url(#thumb-${part.id})`} stroke="#a9b8c0"/><rect x="30" y="70" width="40" height="6" fill={dark}/><ellipse cx="50" cy="46" rx="9" ry="8" fill="#18384a"/></g> : null}
        {type === 'probe' ? <g><path d="M28 35 L43 24 L68 30 L73 62 L55 72 L30 63Z" fill={`url(#thumb-${part.id})`} stroke="#a6b4bc"/><rect x="41" y="40" width="21" height="15" rx="3" fill="#1d4258"/></g> : null}
        {isMotor ? <g><rect x="37" y="17" width="26" height="25" rx="4" fill={`url(#thumb-${part.id})`}/><path d="M40 41 L60 41 L74 74 L26 74Z" fill="#5b6872" stroke="#a6b2b9"/><ellipse cx="50" cy="74" rx="24" ry="5" fill="#c4a77a"/></g> : null}
        {type === 'booster' ? <g>{[31,69].map(x=><g key={x}><rect x={x-9} y="24" width="18" height="46" fill={`url(#thumb-${part.id})`}/><path d={`M${x-9} 24 L${x} 9 L${x+9} 24Z`} fill={metal}/><path d={`M${x-7} 70 L${x+7} 70 L${x+11} 79 L${x-11} 79Z`} fill={dark}/></g>)}</g> : null}
        {type === 'fins' ? <path d="M46 14 L54 14 L54 46 L82 77 L18 77 L46 46Z" fill={`url(#thumb-${part.id})`} stroke="#a6b4bc"/> : null}
        {type === 'solar' ? <g><rect x="4" y="32" width="39" height="26" fill="#163b66" stroke="#91b8d0"/><rect x="57" y="32" width="39" height="26" fill="#163b66" stroke="#91b8d0"/><rect x="44" y="37" width="12" height="17" fill={metal}/>{[17,30,70,83].map(x=><path key={x} d={`M${x} 33 V57`} stroke="#91b8d0"/>)}</g> : null}
        {type === 'antenna' ? <g><path d="M50 70 V28" stroke="#a4b6bf" strokeWidth="4"/><path d="M24 30 Q50 55 76 30 Q50 9 24 30Z" fill="#a4b6bf" stroke="#71818b"/><circle cx="50" cy="20" r="5" fill="#63c6ef"/></g> : null}
        {type === 'legs' ? <g><rect x="42" y="18" width="16" height="43" fill={metal}/><path d="M43 41 L18 76 M57 41 L82 76" stroke="#a6b4bc" strokeWidth="6"/><path d="M9 78 H27 M73 78 H91" stroke={dark} strokeWidth="6"/></g> : null}
        {type === 'parachute' ? <g><path d="M16 49 A34 34 0 0 1 84 49Z" fill={metal}/><path d="M16 49 L50 75 L84 49 M50 49 V75" stroke="#71818b" strokeWidth="2" fill="none"/><rect x="42" y="72" width="16" height="8" fill={dark}/></g> : null}
        {['camera','science','rover','battery','reaction','rcs'].includes(type) ? <g><path d="M25 32 L48 19 L76 31 L76 65 L52 78 L25 65Z" fill={`url(#thumb-${part.id})`} stroke="#a6b4bc"/><ellipse cx="51" cy="49" rx="12" ry="11" fill="#172c3c"/><ellipse cx="51" cy="49" rx="7" ry="7" fill="#2c83a9"/></g> : null}
        {type === 'fairing' ? <path d="M50 9 L70 53 L70 78 L30 78 L30 53Z" fill={`url(#thumb-${part.id})`} stroke="#a6b4bc"/> : null}
        {['shield','decoupler'].includes(type) ? <g><ellipse cx="50" cy="42" rx="33" ry="14" fill={type==='shield'?'#6c4431':'#c3a86e'}/><path d="M17 42 V55 Q50 78 83 55 V42" fill={type==='shield'?'#6c4431':'#a58d59'}/><ellipse cx="50" cy="55" rx="24" ry="9" fill={dark}/></g> : null}
      </svg>
    </div>
  );
}

function StandardAssembly({mission='earth',onBack,onContinue,initialBlueprint}){
  const missionKey=Object.hasOwn(MISSION_DATA,mission)?mission:'earth';
  const missionInfo=MISSION_DATA[missionKey];
  const [build,setBuild]=useState(()=>initialBlueprint?.build|| (missionKey==='moon'?[...LUNAR_BUILD]:missionKey==='mars'?MARS_BUILD.filter(id=>!onContinue||!PAYLOAD_PART_IDS.has(id)):DEFAULT_BUILD));
  const [category,setCategory]=useState('All');
  const [search,setSearch]=useState('');
  const [name,setName]=useState(initialBlueprint?.name||(missionKey==='moon'?'Selene Mk II':missionKey==='mars'?'Ares Pathfinder':'Explorer Mk I'));
  const [selected,setSelected]=useState(null);
  const [notice,setNotice]=useState('Click parts to attach. Click an installed component to select it.');
  const [history,setHistory]=useState([]);
  const [launchOpen,setLaunchOpen]=useState(false);
  const [readinessOpen,setReadinessOpen]=useState(true);
  const filtered=PARTS.filter(p=>(!onContinue||!PAYLOAD_PART_IDS.has(p.id))&&(missionKey!=='moon'||LUNAR_PARTS.has(p.id))&&(category==='All'||p.category===category)&&p.name.toLowerCase().includes(search.toLowerCase()));
  const stats=useMemo(()=>build.map(byId).filter(Boolean).reduce((s,p)=>({mass:s.mass+p.mass,fuel:s.fuel+(p.fuel||0),thrust:s.thrust+(p.thrust||0),cost:s.cost+p.cost}),{mass:0,fuel:0,thrust:0,cost:0}),[build]);
  const twr=stats.mass?stats.thrust/(stats.mass*(missionKey==='moon'?1.62:9.81)):0;
  const tags=new Set(build.flatMap(id=>byId(id)?.tags||[]));
  const checks=missionInfo.checks.filter(([tag])=>!onContinue||['command','propulsion','fuel','power','control'].includes(tag)).map(([tag,label])=>({tag,label,ok:tags.has(tag)}));
  if(missionKey==='mars') checks.push(
    {tag:'budget',label:'Within 45,000 cr launch budget',ok:stats.cost<=45000},
    {tag:'lift',label:'Earth launch thrust / weight above 1.2',ok:twr>1.2},
    {tag:'reserve',label:'At least 430 fuel units for ascent',ok:stats.fuel>=430}
  );
  const readyCount=checks.filter(c=>c.ok).length;
  const ready=readyCount===checks.length;
  const update=next=>{setHistory(h=>[...h.slice(-29),build]);setBuild(next);setSelected(null);};
  const addPart=part=>{
    if(part.category==='Command'&&build.some(id=>byId(id)?.category==='Command')){setNotice('One primary flight controller supported. Remove the current controller before replacing it.');return;}
    if(isEngine(part)&&build.some(id=>isEngine(byId(id)))){setNotice('One central engine supported. You can add a solid booster pair for extra thrust.');return;}
    if(['fins','booster','solar','legs','parachute','fairing'].includes(part.type)&&build.includes(part.id)){setNotice('That attachment set is already installed. Remove it first to replace it.');return;}
    const next=[...build];
    if(part.category==='Command')next.unshift(part.id);
    else if(isAxial(part)){
      const engineIndex=next.findIndex(id=>isEngine(byId(id)));
      next.splice(engineIndex<0?next.length:engineIndex,0,part.id);
    }else next.push(part.id);
    update(next);setNotice(`${part.name} installed.`);
  };
  const remove=index=>{const part=byId(build[index]);update(build.filter((_,i)=>i!==index));setNotice(`${part?.name||'Part'} removed.`);};
  const undo=()=>{if(!history.length)return;setBuild(history.at(-1));setHistory(h=>h.slice(0,-1));setSelected(null);setNotice('Last change undone.');};
  const save=()=>{try{localStorage.setItem(`mission-control-vab-v3-${missionKey}`,JSON.stringify({build,name}));setNotice(`${missionInfo.name} vehicle saved in this browser.`);}catch{setNotice('Save failed.');}};
  const load=()=>{try{const raw=localStorage.getItem(`mission-control-vab-v3-${missionKey}`)||localStorage.getItem('mission-control-vab-v2')||localStorage.getItem('mission-control-vab');const saved=JSON.parse(raw||'null');if(!Array.isArray(saved?.build)){setNotice('No saved vehicle found.');return;}update(saved.build.filter(id=>byId(id)));setName(saved.name||'Explorer Mk I');setNotice('Vehicle loaded.');}catch{setNotice('Load failed.');}};
  if (launchOpen && missionKey==='moon') return <LunarMission stats={stats} name={name} build={build} onBack={()=>setLaunchOpen(false)}/>;
  if (launchOpen) return <LaunchPreparation mission={missionInfo} name={name} build={build} stats={stats} checks={checks} rocket={<Rocket build={build} selected={null} onSelect={()=>{}}/>} onBack={()=>setLaunchOpen(false)}/>;
  return <div className="vab-screen">
    <header className="vab-topbar"><div className="vab-brand"><span className="vab-diamond">◇</span> MISSION CONTROL <small>/ VEHICLE ASSEMBLY BUILDING</small></div><div className="vab-mission">MISSION: <b>{missionInfo.name}</b></div><div className="vab-top-actions"><button onClick={save}>SAVE</button><button onClick={load}>LOAD</button><button onClick={onBack}>✕ EXIT</button></div></header>
    <main className="vab-main">
      <div className="vab-world"><Scene mars={missionKey==='mars'} lunar={missionKey==='moon'} build={build} selected={selected} onSelect={setSelected}/><div className="vab-hangar-caption">VAB-01 <span>•</span> ASSEMBLY BAY</div><div className="vab-hint">{missionKey==='moon'?'YOUR FLIGHT LANDER · DRAG TO INSPECT · CLICK HARDWARE TO SELECT':'DRAG TO ORBIT · SCROLL TO ZOOM · CLICK ROCKET TO SELECT'}</div>{build.length===0&&<div className="vab-center-help">START BUILDING<br/><small>Choose a command pod from the left</small></div>}</div>
      <aside className="vab-parts"><div className="vab-panel-title">PART PICKER <span>◇</span></div><input className="vab-search" placeholder="⌕  Search parts..." value={search} onChange={e=>setSearch(e.target.value)}/><div className="vab-categories">{CATEGORIES.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="vab-parts-list">{filtered.map(p=><button className="vab-part" key={p.id} onClick={()=>addPart(p)} title={`Add ${p.name}`}><Thumbnail part={p}/><span>{p.name}</span><small>{p.mass.toFixed(2)} t</small><strong>＋</strong></button>)}{!filtered.length&&<p className="vab-empty">No matching parts.</p>}</div><div className="vab-panel-footer">PART MODELS MATCH THEIR 3D PREVIEWS</div></aside>
      <aside className="vab-stats"><div className="vab-panel-title">VESSEL CONFIGURATION <span>▤</span></div><label className="vab-small-label" htmlFor="vab-name">VEHICLE NAME</label><input id="vab-name" className="vab-name" value={name} onChange={e=>setName(e.target.value)} maxLength={36}/>
        <div className="vab-section-title">FLIGHT READOUT</div><div className="vab-stat"><span>TOTAL MASS</span><b>{stats.mass.toFixed(2)} t</b></div><div className="vab-stat"><span>FUEL CAPACITY</span><b>{stats.fuel} units</b></div><div className="vab-stat"><span>ENGINE THRUST</span><b>{stats.thrust} kN</b></div><div className="vab-stat"><span>{missionKey==='moon'?'THRUST / MOON WEIGHT':'THRUST / WEIGHT'}</span><b className={twr>=1?'vab-green':'vab-amber'}>{twr.toFixed(2)}</b></div><div className="vab-stat"><span>EST. PART COST</span><b>{stats.cost.toLocaleString()} cr</b></div>
        <button className="vab-section-title vab-readiness-toggle" onClick={()=>setReadinessOpen(x=>!x)}>MISSION READINESS <span>{readyCount}/{checks.length} {readinessOpen?'▾':'▸'}</span></button>
        {readinessOpen&&<div className="vab-readiness"><div className="vab-readiness-destination">{missionInfo.destination}<small>{missionInfo.objective}</small></div>{checks.map(c=><div className={`vab-check ${c.ok?'pass':'fail'}`} key={c.tag}><span>{c.ok?'✓':'○'}</span>{c.label}</div>)}<div className={`vab-readiness-result ${ready?'pass':'fail'}`}>{ready?'✓ PARTS CHECK COMPLETE':'⚠ MISSING REQUIRED SYSTEMS'}</div></div>}
        <div className="vab-section-title">INSTALLED COMPONENTS <small>{build.length}</small></div><div className="vab-build-list">{build.map((id,i)=><div className={`vab-installed ${selected===i?'chosen':''}`} key={`${id}-${i}`} onClick={()=>setSelected(i)}><span>{String(i+1).padStart(2,'0')}</span><b>{byId(id)?.name}</b><button title="Remove part" onClick={e=>{e.stopPropagation();remove(i);}}>✕</button></div>)}{!build.length&&<p className="vab-empty">Choose a part from the left.</p>}</div><div className="vab-status">{notice}</div>
      </aside>
    </main>
    <footer className="vab-toolbar"><div className="vab-toolbar-left">{missionKey==='moon'&&<button onClick={()=>{update([...LUNAR_BUILD]);setName('Selene Mk II');setNotice('Complete lunar lander loaded: rover, sampler, seismometer, camera and fuel. This same model flies the mission; booster supplied separately.');}}>LOAD LUNAR LANDER</button>}<button onClick={undo} disabled={!history.length}>↶ UNDO</button><button onClick={()=>{update(missionKey==='moon'?[...LUNAR_BUILD]:missionKey==='mars'?[...MARS_BUILD]:DEFAULT_BUILD);setNotice('Default rocket restored.');}}>↻ RESET</button><button onClick={()=>{update([]);setNotice('Assembly cleared. Choose a part to begin.');}}>⌫ CLEAR</button>{selected!==null&&<button className="vab-remove" onClick={()=>remove(selected)}>✕ REMOVE SELECTED</button>}</div><span>VEHICLE ASSEMBLY · BUILD MODE</span><button className="vab-launch" onClick={()=>{if(ready){if(onContinue)onContinue({name,build:[...build],stats,checks});else setLaunchOpen(true);}else{setReadinessOpen(true);setNotice('Complete the missing mission systems shown in Mission Readiness before proceeding.');}}}>{ready?(onContinue?'NEXT → BUILD LANDER & ROVER':missionKey==='moon'?'FLY THIS LANDER →':'PROCEED TO LAUNCH PAD →'):'CHECK MISSION →'}</button></footer>
  </div>;
}

export default function SpacecraftAssembly(props){
  if(props.mission==='moon')return <LunarAssembly {...props}/>;
  if(props.mission==='mars')return <MarsAssembly {...props} RocketBuilder={StandardAssembly} RocketComponent={Rocket} HangarComponent={Hangar} parts={PARTS}/>;
  return <StandardAssembly {...props}/>;
}
