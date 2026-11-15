import {useRef,useState,Suspense} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {PARTS,Rocket,Hangar,Thumbnail} from './SpacecraftAssembly';
import {LunarLander} from './LunarVisuals';
import LunarStack,{rocketHeight} from './LunarStack';
import LunarMission from './LunarMission';
import './LunarAssembly.css';

const ROCKET_PRESET=['probe','cryoTank','cryoTank','cryoTank','cryoTank','cryoTank','cryoTank','heavyEngine','booster','fin','decoupler','battery','deepAntenna','fairing'];
const LANDER_PRESET=['probe','cryoTank','cryoTank','cryoTank','cryoTank','vacEngine','legs','battery','solar','deepAntenna','reaction','science','rover','camera'];
const modules=[
 ['probe','Lander flight computer','Avionics inside the silver ascent bus.'],
 ['cryoTank','Descent propellant tank','Internal tank enclosed by the gold foil descent module.'],
 ['vacEngine','Descent engine','Throttleable engine bell beneath the lander.'],
 ['legs','Landing strut set','Four gold shock struts and footpads.'],
 ['battery','Lander battery','Electrical storage inside the descent module.'],
 ['solar','Solar wing pair','Blue solar panels on either side.'],
 ['deepAntenna','Earth-link dish','The dish mounted above the ascent module.'],
 ['reaction','Attitude control package','Internal reaction wheels and orientation control.'],
 ['science','Seismic instrument bay','Sensor package carried beside the lander hatch.'],
 ['rover','Exploration rover','Folded rover payload mounted on the descent module.'],
 ['camera','Surface camera','The dark circular lens beside the hatch.'],
];
const part=id=>PARTS.find(p=>p.id===id);
const statsFor=build=>build.reduce((s,id)=>{const p=part(id);return p?{mass:s.mass+p.mass,fuel:s.fuel+(p.fuel||0),thrust:s.thrust+(p.thrust||0),cost:s.cost+p.cost}:s;},{mass:0,fuel:0,thrust:0,cost:0});
function ModuleIcon({id}){
 const gold='#c5a258',silver='#c6cecb',dark='#354349';
 return <svg viewBox="0 0 100 80" aria-hidden="true">
  {id==='probe'&&<><path d="M30 20L50 12 70 20V55L50 64 30 55Z" fill={silver}/><path d="M33 28L47 22 47 44 33 40Z M53 22L67 29 67 40 53 44Z" fill={dark}/></>}
  {id==='cryoTank'&&<><path d="M20 24L50 15 80 24V59L50 69 20 59Z" fill={gold}/><path d="M50 24V64 M24 28L77 29 M34 20V61 M65 20V63" stroke="#e0c587" strokeWidth="2"/><path d="M20 24L50 34 80 24" fill="none" stroke="#8e6c34"/></>}
  {id==='vacEngine'&&<><rect x="39" y="13" width="22" height="17" fill={silver}/><path d="M42 29H58L75 65H25Z" fill="#636d70" stroke={silver}/><ellipse cx="50" cy="65" rx="25" ry="6" fill={dark}/></>}
  {id==='legs'&&<><path d="M39 15L25 65 M61 15L75 65 M37 33L72 62 M63 33L28 62" stroke={gold} strokeWidth="5"/><ellipse cx="25" cy="66" rx="14" ry="5" fill={gold}/><ellipse cx="75" cy="66" rx="14" ry="5" fill={gold}/></>}
  {id==='solar'&&<><path d="M11 27H43V55H11Z M57 27H89V55H57Z" fill="#1c4970" stroke={silver}/><path d="M21 27V55 M32 27V55 M68 27V55 M79 27V55 M43 41H57" stroke="#9db4c0"/></>}
  {id==='deepAntenna'&&<><path d="M50 65L55 36" stroke={silver} strokeWidth="3"/><ellipse cx="55" cy="30" rx="25" ry="15" transform="rotate(-25 55 30)" fill={silver}/><path d="M55 30L62 9" stroke={gold} strokeWidth="2"/></>}
  {id==='rover'&&<><path d="M23 33H74V55H23Z" fill={silver}/><path d="M21 28H77V36H21Z" fill="#214e73"/>{[28,68].map(x=><circle key={x} cx={x} cy="57" r="11" fill="#4c5250"/>)}<path d="M52 29V13" stroke={silver} strokeWidth="3"/><rect x="44" y="9" width="16" height="8" fill={silver}/></>}
  {id==='camera'&&<><rect x="27" y="25" width="47" height="33" rx="3" fill={silver}/><circle cx="51" cy="42" r="13" fill={dark}/><circle cx="51" cy="42" r="8" fill="#286083"/></>}
  {['battery','reaction','science'].includes(id)&&<><path d="M25 27L50 17 75 27V58L50 68 25 58Z" fill={id==='science'?gold:silver}/><path d="M25 27L50 38 75 27 M50 38V68" fill="none" stroke={dark}/><circle cx="50" cy="46" r="9" fill={dark}/></>}
 </svg>;
}
function AssemblyScene({stage,rocketBuild,landerBuild,inspect}){
 const preview=useRef({phase:'preview',pitch:0,legs:false,solar:false,engine:false,fuel:0,throttle:0,boostersSeparated:false,fairingSeparated:false});
 const h=rocketHeight(rocketBuild)+7.5,isRocket=stage!=='lander';
 return <Canvas shadows camera={{position:isRocket?[10,h*.33+2,18]:[7,4.5,10],fov:43,near:.1,far:150}} dpr={[1,1.5]}><group scale={isRocket?2:1}><Hangar/></group><Suspense fallback={null}><group scale={isRocket?.55:1}>{stage==='rocket'?<LunarStack flight={preview} rocketBuild={rocketBuild} landerBuild={landerBuild} preview/>:stage==='lander'?<LunarLander flight={preview} build={landerBuild} assembly inspect={inspect}/>:<LunarStack flight={preview} rocketBuild={rocketBuild} landerBuild={landerBuild} preview cutaway/>}</group></Suspense><OrbitControls target={[0,isRocket?h*.275:1.8,0]} minDistance={5} maxDistance={45} maxPolarAngle={Math.PI/2.04} enableDamping/></Canvas>;
}
export default function LunarAssembly({onBack}){
 const [stage,setStage]=useState('rocket'),[rocketBuild,setRocket]=useState([...ROCKET_PRESET]),[landerBuild,setLander]=useState([...LANDER_PRESET]),[inspect,setInspect]=useState('solar');
 const [name,setName]=useState('Selene Mk III'),[rocketName,setRocketName]=useState('Pathfinder Heavy'),[flying,setFlying]=useState(false),[notice,setNotice]=useState('Step 1: build the launch rocket. Next you will equip its Moon lander.');
 const rocket=statsFor(rocketBuild),lander=statsFor(landerBuild),build=stage==='rocket'?rocketBuild:landerBuild;
 const mass=rocket.mass+lander.mass+50,twr=rocket.thrust/(mass*9.81);
 const rocketChecks=[['probe','Flight computer'],['heavyEngine','Main lift engine'],['booster','Booster pair'],['decoupler','Stage separation system'],['battery','Electrical power'],['fairing','Payload fairing']].map(([id,label])=>({label,ok:rocketBuild.includes(id)}));
 rocketChecks.push({label:'Propellant tanks',ok:rocket.fuel>0},{label:'Lift entire mission stack (TWR >1.05)',ok:twr>1.05});
 const landerChecks=modules.map(([id,label])=>({label,ok:landerBuild.includes(id)}));
 const rocketReady=rocketChecks.every(c=>c.ok),landerReady=landerChecks.every(c=>c.ok),ready=rocketReady&&landerReady;
 const edit=(id,remove=false)=>{if(stage==='lander')setInspect(id);const set=stage==='rocket'?setRocket:setLander;if(remove){const at=build.lastIndexOf(id);set(build.filter((_,i)=>i!==at));setNotice(`${part(id).name} removed.`);return;}const p=part(id);if(id==='cryoTank'&&build.filter(x=>x===id).length>=(stage==='lander'?4:6)){setNotice('All available tank positions are occupied.');return;}if(id!=='cryoTank'&&build.includes(id)){setNotice('That equipment is already installed.');return;}set([...build,id]);setNotice(`${p.name} installed. ${stage==='lander'?'Its matching hardware is on this same lander.':''}`);};
 const save=()=>{try{localStorage.setItem('lunar-stack-v3',JSON.stringify({rocketBuild,landerBuild,name,rocketName}));setNotice('Rocket and lander configuration saved.');}catch{setNotice('Could not save this configuration.');}};
 const load=()=>{try{const d=JSON.parse(localStorage.getItem('lunar-stack-v3')||'null');if(!Array.isArray(d?.rocketBuild)||!Array.isArray(d?.landerBuild)){setNotice('No saved two-vehicle mission found.');return;}setRocket(d.rocketBuild.filter(id=>part(id)));setLander(d.landerBuild.filter(id=>part(id)));setName(d.name||'Selene Mk III');setRocketName(d.rocketName||'Pathfinder Heavy');setNotice('Both vehicles loaded.');}catch{setNotice('Could not load the saved vehicles.');}};
 if(flying)return <LunarMission stats={lander} name={name} build={landerBuild} architecture={{rocketBuild,rocketStats:rocket,rocketName}} onBack={()=>setFlying(false)}/>;
 const rocketOptions=PARTS.filter(p=>['probe','cryoTank','heavyEngine','booster','fin','decoupler','battery','deepAntenna','fairing'].includes(p.id));
 return <div className="vab-screen la-screen"><header className="vab-topbar"><div className="vab-brand">◇ LUNAR MISSION WORKSHOP</div><div className="vab-top-actions"><button onClick={save}>SAVE BOTH</button><button onClick={load}>LOAD BOTH</button><button onClick={onBack}>✕ EXIT</button></div></header>
  <nav className="la-steps">{[['rocket','1','BUILD ROCKET'],['lander','2','BUILD LANDER'],['review','3','REVIEW FULL STACK']].map(([id,n,label])=><button key={id} className={stage===id?'active':''} onClick={()=>setStage(id)}><b>{n}</b>{label}<span>{id==='rocket'&&rocketReady||id==='lander'&&landerReady?'✓':''}</span></button>)}</nav>
  <main className="vab-main"><div className="vab-world"><AssemblyScene key={`${stage}-${inspect}-${landerBuild.join(',')}-${rocketBuild.join(',')}`} stage={stage} rocketBuild={rocketBuild} landerBuild={landerBuild} inspect={inspect}/><div className="vab-hangar-caption">{stage==='rocket'?'LAUNCH VEHICLE':stage==='lander'?'YOUR ACTUAL MOON LANDER':'ROCKET + TRANSFER SERVICE + LANDER'}</div><div className="vab-hint">DRAG TO INSPECT · SCROLL TO ZOOM · {stage==='review'?'FAIRING CUTAWAY VIEW':'MATCHING HARDWARE IN FLIGHT'}</div></div>
   <aside className="vab-parts"><div className="vab-panel-title">{stage==='rocket'?'ROCKET COMPONENTS':stage==='lander'?'LANDER EQUIPMENT':'MISSION ARCHITECTURE'}</div>
    {stage==='rocket'?<div className="vab-parts-list">{rocketOptions.map(p=><button className="vab-part" key={p.id} onClick={()=>edit(p.id)}><Thumbnail part={p}/><span>{p.name}</span><small>{p.mass.toFixed(2)} t</small><strong>＋</strong></button>)}</div>:stage==='lander'?<div className="la-modules">{modules.map(([id,label,description])=><div key={id} className={`la-module ${inspect===id?'selected':''}`}><button className="la-inspect" aria-label={`Inspect ${label}`} onClick={()=>setInspect(id)}><ModuleIcon id={id}/></button><div><b>{label}</b><small>{description}</small><span>{landerBuild.filter(x=>x===id).length} installed</span></div><button aria-label={`Add ${label}`} onClick={()=>edit(id)}>＋</button>{landerBuild.includes(id)&&<button aria-label={`Remove ${label}`} onClick={()=>edit(id,true)}>−</button>}</div>)}</div>:<div className="la-architecture"><h3>HOW YOUR MISSION WORKS</h3><p><b>1. Rocket launch</b>Your configured rocket lifts the complete mission stack from Earth.</p><p><b>2. Staging</b>Boosters and fairing separate. The transfer service carries your lander toward the Moon.</p><p><b>3. Lunar landing</b>The same lander you equipped separates and lands using its own engine.</p><p><b>4. Exploration</b>Your rover samples the rock and soil, deploys the instrument, and takes photos.</p><small>Ascent and interplanetary transfer are assisted game phases. The supplied transfer service has a separate 50 t wet-mass allowance. Distances and model scale are illustrative.</small></div>}
   </aside>
   <aside className="vab-stats"><div className="vab-panel-title">{stage==='rocket'?'LAUNCH VEHICLE':stage==='lander'?'LUNAR LANDER':'COMPLETE MISSION'}</div><label className="vab-small-label" htmlFor="la-name">{stage==='rocket'?'ROCKET NAME':'LANDER NAME'}</label><input id="la-name" className="vab-name" maxLength={36} value={stage==='rocket'?rocketName:name} onChange={e=>stage==='rocket'?setRocketName(e.target.value):setName(e.target.value)}/>
    <div className="vab-section-title">MISSION READOUT</div><div className="vab-stat"><span>ROCKET WET MASS</span><b>{rocket.mass.toFixed(2)} t</b></div><div className="vab-stat"><span>LANDER WET MASS</span><b>{lander.mass.toFixed(2)} t</b></div><div className="vab-stat"><span>TRANSFER SERVICE</span><b>50.00 t</b></div><div className="vab-stat"><span>LIFTOFF MASS</span><b>{mass.toFixed(2)} t</b></div><div className="vab-stat"><span>EARTH LIFTOFF TWR</span><b className={twr>1.05?'vab-green':'vab-amber'}>{twr.toFixed(2)}</b></div><div className="vab-stat"><span>LANDER THRUST</span><b>{lander.thrust} kN</b></div>
    <div className="vab-section-title">{stage==='rocket'?'ROCKET CHECKS':'LANDER CHECKS'}</div><div className="vab-readiness">{(stage==='rocket'?rocketChecks:landerChecks).map(c=><div key={c.label} className={`vab-check ${c.ok?'pass':'fail'}`}><span>{c.ok?'✓':'○'}</span>{c.label}</div>)}</div>
    {stage!=='review'&&<><div className="vab-section-title">INSTALLED {stage==='rocket'?'ROCKET PARTS':'LANDER MODULES'}</div><div className="vab-build-list">{build.map((id,i)=><div className="vab-installed" key={`${id}-${i}`}><span>{String(i+1).padStart(2,'0')}</span><b>{stage==='lander'?(modules.find(m=>m[0]===id)?.[1]||part(id).name):part(id).name}</b><button aria-label={`Remove ${part(id).name} ${i+1}`} onClick={()=>edit(id,true)}>✕</button></div>)}</div></>}
    <div className="vab-status">{stage==='lander'&&<p><b>INSPECT: {modules.find(m=>m[0]===inspect)?.[1]}</b><br/>{modules.find(m=>m[0]===inspect)?.[2]}<br/>Click a part icon to locate it. Internal parts open a cutaway. The hull is the supplied frame.</p>}{notice}</div>
   </aside>
  </main><footer className="vab-toolbar"><div className="vab-toolbar-left"><button onClick={()=>{setRocket([...ROCKET_PRESET]);setLander([...LANDER_PRESET]);setNotice('Complete flight-tested rocket and lander restored.');}}>LOAD COMPLETE MISSION</button><button onClick={()=>{if(stage==='rocket')setRocket([]);else setLander([]);}}>CLEAR {stage==='rocket'?'ROCKET':'LANDER'}</button></div><span>{stage==='rocket'?'NEXT: EQUIP THE MOON LANDER':stage==='lander'?'NEXT: REVIEW YOUR COMBINED VEHICLE':'READY FOR LAUNCH'}</span><button className="vab-launch" disabled={stage==='rocket'?!rocketReady:stage==='lander'?!landerReady:!ready} onClick={()=>stage==='rocket'?setStage('lander'):stage==='lander'?setStage('review'):setFlying(true)}>{stage==='rocket'?'NEXT → BUILD LANDER':stage==='lander'?'NEXT → REVIEW STACK':'LAUNCH THIS MISSION →'}</button></footer>
 </div>;
}
