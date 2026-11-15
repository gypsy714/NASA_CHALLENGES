import { useMissionIntegration } from './missionIntegration.js';
import {Suspense,useEffect,useRef,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import * as THREE from 'three';
import LunarVisuals from './LunarVisuals';
import LunarSurfacePanel from './LunarSurfacePanel';
import {FlightConsole,LanderConsole,RoverConsole} from './LunarConsoles';
import {createMission,command,step,clamp} from './lunarPhysics.js';
import './LunarMission.css';

const titles={briefing:'LUNAR MISSION BRIEFING',launch:'EARTH LAUNCH',parking:'EARTH PARKING ORBIT',transfer:'FLYING TO THE MOON',arrival:'MOON APPROACH',orbit:'LUNAR ORBIT',separation:'LANDER SEPARATION',descent:'POWERED DESCENT',landed:'EXPLORE THE SURFACE',transmitting:'SENDING RESULTS TO EARTH',success:'MISSION SUCCESS',failed:'VEHICLE LOST'};
const num=(v,d=0)=>Number(v).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const hints={briefing:'Land on the Moon. Drive a rover to collect a basalt rock and lunar soil, deploy a seismic sensor, take photos, then send the analyses to Earth.',launch:'Watch your lander ride the service booster into Earth orbit. This is an assisted launch, with a visible countdown and ascent.',parking:'You reached Earth orbit. Open the solar array, then start the Moon transfer.',transfer:'Your spacecraft is coasting toward the Moon—not loading. Five simulated days take about 43 seconds. You can skip the coast.',arrival:'You reached the Moon. Fire the service engine to slow down into lunar orbit.',orbit:'Separate the lander. Guidance will brake it and land using the engine. You can take manual control.',separation:'The lander is separating from the transfer stage. Watch the service stage move away, then landing guidance will start its engine.',descent:'Landing guidance is slowing the lander. Keep guidance ON for an assisted landing, or fly manually.',transmitting:'Sending the rock and soil analyses, seismic readings, and saved surface photos. Physical samples stay on the Moon.'};
export default function LunarMission({stats,name,build,architecture,onBack}){
 const flight=useRef(null);if(!flight.current)flight.current=createMission(stats,architecture?.rocketStats);
 const [s,setState]=useState(()=>({...flight.current})),[view,setView]=useState('follow'),[voice,setVoice]=useState(true),[panel,setPanel]=useState('flight');
 const voices=useRef(new Set()),lastEvent=useRef(''),captureRequest=useRef(false),photoPending=useRef(false),keys=useRef(new Set());
 useEffect(()=>{if(s.phase==='landed')setPanel('rover');else if(['launch','parking','transfer','arrival','orbit','separation','descent'].includes(s.phase))setPanel('flight');},[s.phase]);
 const update=()=>setState({...flight.current});
 const act=action=>{command(flight.current,action);if(action==='deployRover'||action.startsWith('goto:'))setView('surface');update();};
 const move=(x,z)=>{const r=flight.current.rover;r.target=null;r.input={x,z};update();};
 const takePhoto=()=>{if(photoPending.current||flight.current.phase!=='landed')return;setView('surface');photoPending.current=true;captureRequest.current=true;};
 const onPhoto=url=>{photoPending.current=false;if(url)command(flight.current,'photo',url);else flight.current.events=['Photo capture failed. Please retry.',...flight.current.events].slice(0,12);update();};
 useEffect(()=>{
  let previous=performance.now();const timer=setInterval(()=>{
   const now=performance.now(),f=flight.current,elapsed=Math.min(.25,(now-previous)/1000);previous=now;
   if(f.phase==='transfer')step(f,elapsed*f.warp);
   else {let remaining=elapsed*f.warp;while(remaining>0){const dt=Math.min(.05,remaining);step(f,dt);remaining-=dt;}}
   setState({...f});
  },50);return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{const text=s.events[0];if(text===lastEvent.current)return;lastEvent.current=text;if(!voice||!window.speechSynthesis)return;voices.current.clear();window.speechSynthesis.cancel();const cue=text.startsWith('Driving to')?'Rover moving to the selected target.':text.startsWith('Rover arm')?'Collecting sample.':text.includes('collected:')?'Sample collected and analysed.':text.startsWith('Recording simulated')?'Recording seismic survey.':text.startsWith('Seismic survey complete')?'Seismic survey saved.':text.startsWith('I03 seismic')?'Seismometer deployed.':text;const u=new SpeechSynthesisUtterance(cue);u.lang='en-US';u.rate=1.3;u.volume=.85;voices.current.add(u);u.onend=u.onerror=()=>voices.current.delete(u);window.speechSynthesis.speak(u);},[s.events,voice]);
 useEffect(()=>()=>{voices.current.clear();window.speechSynthesis?.cancel();},[]);
 useEffect(()=>{
  const stop=()=>{keys.current.clear();flight.current.rover.input={x:0,z:0};};
  const down=e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey)return;const f=flight.current,k=e.key.toLowerCase();
   if(f.phase==='landed'&&f.rover.deployed&&['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){e.preventDefault();keys.current.add(k);f.rover.target=null;f.rover.input={x:(keys.current.has('arrowright')||keys.current.has('d')?1:0)-(keys.current.has('arrowleft')||keys.current.has('a')?1:0),z:(keys.current.has('arrowdown')||keys.current.has('s')?1:0)-(keys.current.has('arrowup')||keys.current.has('w')?1:0)};return;}
   if(f.phase!=='descent')return;if(['w','s','a','d','x'].includes(k))e.preventDefault();if(k==='x')command(f,'cut');if(!f.auto){if(k==='w')f.throttle=clamp(f.throttle+2,0,100);if(k==='s')f.throttle=clamp(f.throttle-2,0,100);if(k==='a')f.pitch=clamp(f.pitch-2,-180,180);if(k==='d')f.pitch=clamp(f.pitch+2,-180,180);}setState({...f});};
  const up=e=>{keys.current.delete(e.key.toLowerCase());const r=flight.current.rover;r.input={x:(keys.current.has('arrowright')||keys.current.has('d')?1:0)-(keys.current.has('arrowleft')||keys.current.has('a')?1:0),z:(keys.current.has('arrowdown')||keys.current.has('s')?1:0)-(keys.current.has('arrowup')||keys.current.has('w')?1:0)};};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',stop);return()=>{stop();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',stop);};
 },[]);
 const restart=()=>{window.speechSynthesis?.cancel();voices.current.clear();keys.current.clear();captureRequest.current=photoPending.current=false;flight.current=createMission(stats,architecture?.rocketStats);setView('follow');update();};
 useMissionIntegration('lunar',name,s,(action,value)=>{
  const f=flight.current;
  if(action==='photo')takePhoto();
  else if(action==='captureOrbit')act('capture');
  else if(action==='guidance'&&f.phase==='descent'){f.auto=!!value;update();}
  else if(action==='throttle'&&f.phase==='descent'&&!f.auto){f.throttle=clamp(value,0,100);update();}
  else if(action==='pitch'&&f.phase==='descent'&&!f.auto){f.pitch=clamp(value,-30,30);update();}
  else act(action);
 });
 const deltaV=s.isp*9.80665*Math.log((s.dryMass+s.fuel)/s.dryMass),progress=s.transferTime/s.transferDuration;
 const surface=['landed','transmitting','success'].includes(s.phase);
 const tasks=[['Launch into Earth orbit',s.milestones.parking],['Travel to the Moon',s.milestones.transfer],['Enter lunar orbit',s.milestones.orbit],['Land safely',s.milestones.landing],['Deploy the rover',s.rover.deployed],['B01: collect basalt rock',s.samples.basalt],['S02: collect lunar soil',s.samples.regolith],['I03: deploy seismic sensor',s.instrument],['Record seismic survey',s.survey],['Save a surface photo',s.photos.length>0],['Transmit findings to Earth',s.transmitted]];
 return <div className="lm-app">
  <header className="lm-header"><div><b>BEYOND EARTH</b><span>LUNAR EXPLORATION / MISSION 002</span></div><button onClick={onBack}>← ASSEMBLY</button></header>
  <div className="lm-layout"><main className="lm-viewport">
   <Canvas shadows camera={{position:[0,16,82],fov:44,near:.1,far:20000}} dpr={[1,1.5]} gl={{antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;gl.shadowMap.type=THREE.PCFSoftShadowMap;}}><Suspense fallback={null}><LunarVisuals flight={flight} view={view} build={build} architecture={architecture} captureRequest={captureRequest} onPhoto={onPhoto} onNavigate={key=>act(`goto:${key}`)}/></Suspense></Canvas>
   <div className="lm-scene-head"><span className="lm-live">● LIVE</span><span>{titles[s.phase]}</span></div>
   <div className="lm-camera"><button className={view==='follow'?'selected':''} onClick={()=>setView('follow')}>{['briefing','launch','parking','transfer','arrival'].includes(s.phase)?'ROCKET':'LANDER'}</button><button disabled={!surface||!s.rover.deployed} className={view==='surface'?'selected':''} onClick={()=>setView('surface')}>ROVER</button><button className={view==='orbit'?'selected':''} onClick={()=>setView('orbit')}>MOON</button><button onClick={()=>{if(voice){voices.current.clear();window.speechSynthesis?.cancel();}setVoice(v=>!v);}}>VOICE {voice?'ON':'OFF'}</button></div>
   {s.phase==='launch'&&<div className="lm-launch-banner"><small>SERVICE BOOSTER / YOUR LANDER ABOARD</small><h1>{s.launchTime<3?`T−${Math.ceil(3-s.launchTime)}`:'LIFTOFF'}</h1><p>{s.launchTime<3?'Countdown to Earth launch':`${num(s.altitude/1000,1)} km · climbing toward Earth orbit`}</p></div>}
   {['briefing','parking','transfer','arrival'].includes(s.phase)&&<div className="lm-journey-note"><small>{s.phase==='transfer'?'FLIGHT IN PROGRESS · NOT A LOADING SCREEN':'EARTH → MOON'}</small><h2>{titles[s.phase]}</h2><p>{hints[s.phase]}</p>{s.phase==='transfer'&&<><div className="lm-progress"><i style={{width:`${progress*100}%`}}/></div><b>{num(progress*100,1)}% · {num((s.transferDuration-s.transferTime)/3600,1)} simulated hours left</b><button onClick={()=>act('skipCoast')}>SKIP COAST → MOON</button></>}</div>}
   {(['success','failed'].includes(s.phase)||(s.phase==='landed'&&!s.rover.deployed))&&<div className={`lm-result ${s.phase==='failed'?'bad':''} ${surface?'lm-contact':''}`}><small>{s.phase==='failed'?'REVIEW & RETRY':'TRANQUILLITY BASE'}</small><h1>{s.phase==='landed'?'SOFT LANDING':titles[s.phase]}</h1><p>{s.phase==='success'?'Both samples analysed, seismic survey and photos received on Earth.':s.phase==='landed'?'Next: deploy your rover and explore the three marked targets.':s.reason}</p><p>Touchdown {num(s.contactVertical||0,2)} m/s · {num(s.contactHorizontal||0,2)} m/s lateral</p>{['success','failed'].includes(s.phase)&&<button onClick={restart}>RESTART LUNAR MISSION</button>}</div>}
   {s.phase==='transmitting'&&<div className="lm-uplink"><small>EARTH RECEIVING</small><h2>Sending science data… {Math.round(s.transmitTime/8*100)}%</h2><div className="lm-progress"><i style={{width:`${s.transmitTime/8*100}%`}}/></div></div>}
   <div className="lm-bottom"><span>{surface?`ROVER ${num(s.rover.x,1)}, ${num(s.rover.z,1)} m`:`ALT ${num(s.altitude/1000,2)} km`}</span><span>V/S {num(s.vertical,1)} m/s</span><span>{surface?`${Number(s.samples.basalt)+Number(s.samples.regolith)} / 2 SAMPLES`:`LATERAL ${num(s.horizontal,1)} m/s`}</span><span>{num(s.warp)}× TIME</span></div>
  </main><aside className="lm-panel">
   <div className="lm-title"><small>{['briefing','launch'].includes(s.phase)?'YOUR LAUNCH ROCKET':'YOUR MOON LANDER'}</small><h2>{['briefing','launch'].includes(s.phase)?architecture?.rocketName:(name||'Selene')}</h2><span>{titles[s.phase]}</span></div>
   <div className="lm-readouts"><div><small>{surface?'BATTERY':'ALTITUDE'}</small><b>{surface?num(s.battery):num(s.altitude/1000,2)} <i>{surface?'%':'km'}</i></b></div><div><small>{surface?'SURFACE PHOTOS':'DESCENT RATE'}</small><b>{surface?s.photos.length:num(s.vertical,1)} <i>{surface?'/ 3':'m/s'}</i></b></div><div><small>{['briefing','launch'].includes(s.phase)?'ROCKET PROPELLANT':'LANDER PROPELLANT'}</small><b>{num(['briefing','launch'].includes(s.phase)?s.launchFuel:s.fuel)} <i>kg</i></b></div><div><small>LANDER REMAINING ΔV</small><b>{num(deltaV)} <i>m/s</i></b></div></div>
   <nav className="lm-control-tabs" aria-label="Vehicle control panels">{[['flight','FLIGHT'],['lander','LANDER'],['rover','ROVER'],['science','SCIENCE']].map(([id,label])=><button key={id} className={panel===id?'selected':''} onClick={()=>setPanel(id)}>{label}</button>)}</nav>
   <div className="lm-section lm-console">{panel==='flight'&&<FlightConsole s={s} act={act}/>} {panel==='lander'&&<LanderConsole s={s} act={act}/>} {panel==='rover'&&<RoverConsole s={s} act={act} onSpeed={value=>{flight.current.rover.cruiseSpeed=value;update();}}/>} {panel==='science'&&<><h3>SCIENCE OPERATIONS</h3>{surface?<LunarSurfacePanel scienceOnly s={s} act={act} onPhoto={takePhoto} onView={()=>setView('surface')} onMove={move}/>:<p>Science activities unlock after landing. Your rover, sampler, seismometer and camera are aboard.</p>}</>}</div>
   <div className="lm-section"><h3>MISSION CONTROL / NEXT ACTION</h3>
    {!surface&&<p className="lm-plain-guide">{hints[s.phase]||s.reason}</p>}
    {s.phase==='briefing'&&<button className="lm-primary" onClick={()=>act('park')}>START LAUNCH → EARTH ORBIT</button>}
    {s.phase==='parking'&&<><button onClick={()=>act('solar')} disabled={s.solar}>{s.solar?'✓ SOLAR ARRAY OPEN':'1 · OPEN SOLAR ARRAY'}</button><button className="lm-primary" disabled={!s.solar} onClick={()=>act('transfer')}>2 · FLY TO THE MOON</button></>}
    {s.phase==='transfer'&&<button className="lm-primary" onClick={()=>act('skipCoast')}>SKIP COAST → MOON</button>}
    {s.phase==='arrival'&&<button className="lm-primary" onClick={()=>act('capture')}>ENTER LUNAR ORBIT</button>}
    {s.phase==='orbit'&&<button className="lm-primary" onClick={()=>act('descend')}>SEPARATE LANDER → BEGIN LANDING</button>}
    {s.phase==='descent'&&panel==='flight'&&<><div className="lm-mode">{s.auto?'LANDING GUIDANCE ON':'MANUAL FLIGHT'} · {num(s.pitch)}° TILT</div><button onClick={()=>act('auto')}>{s.auto?'TAKE MANUAL CONTROL':'ENGAGE LANDING GUIDANCE'}</button><label>ENGINE THROTTLE <b>{num(s.throttle)}%</b><input aria-label="Lunar engine throttle" type="range" min="0" max="100" disabled={s.auto} value={s.throttle} onChange={e=>{flight.current.throttle=Number(e.target.value);update();}}/></label><label>LANDER TILT <b>{num(s.pitch)}°</b><input aria-label="Lunar lander tilt" type="range" min="-180" max="180" disabled={s.auto} value={clamp(s.pitch,-180,180)} onChange={e=>{flight.current.pitch=Number(e.target.value);update();}}/></label><div className="lm-row"><button disabled={s.engine||s.fuel<=0} onClick={()=>act('ignite')}>ENGINE START</button><button onClick={()=>act('cut')}>ENGINE CUTOFF</button></div><small>W/S throttle · A/D tilt · X cutoff. No parachutes on the Moon.</small></>}
    {s.phase==='landed'&&panel==='rover'&&<LunarSurfacePanel s={s} act={act} onPhoto={takePhoto} onView={()=>setView('surface')} onMove={move}/>}
    {s.phase==='landed'&&panel!=='rover'&&<><p>The rover expedition is ready. Open its drive console to collect the two samples and deploy the sensor.</p><button className="lm-primary" onClick={()=>setPanel('rover')}>OPEN ROVER CONTROLS / NEXT TASK</button></>}
    {s.phase==='transmitting'&&<><p>{hints.transmitting}</p><div className="lm-progress"><i style={{width:`${s.transmitTime/8*100}%`}}/></div></>}
    {s.phase==='success'&&<><p>All surface objectives completed. Your photo gallery remains available below.</p><div className="lm-surface-gallery">{s.photos.map((p,i)=><figure key={p.id}><img src={p.url} alt={`Lunar surface observation ${i+1}`}/><figcaption><a href={p.url} download={`Lunar-Observation-${i+1}.png`}>SAVE PHOTO {i+1}</a></figcaption></figure>)}</div></>}
    <div className="lm-row"><button disabled={s.legs||!['orbit','descent'].includes(s.phase)} onClick={()=>act('legs')}>{s.legs?'✓ LANDING LEGS DOWN':'EXTEND LANDING LEGS'}</button><button disabled={['failed','success','parking','briefing','launch'].includes(s.phase)} onClick={()=>act('solar')}>SOLAR {s.solar?'OPEN':'STOWED'}</button></div>
    {['orbit','descent'].includes(s.phase)&&<div className="lm-row lm-warp">{[1,5,10,20].map(n=><button key={n} className={s.warp===n?'selected':''} onClick={()=>{flight.current.warp=n;update();}}>{n}×</button>)}</div>}
   </div>
   <div className="lm-section"><h3>YOUR OBJECTIVES · {tasks.filter(t=>t[1]).length}/{tasks.length}</h3>{tasks.map(([label,done])=><div className={`lm-task ${done?'done':''}`} key={label}><span>{done?'✓':'○'}</span>{label}</div>)}</div>
   <div className="lm-section lm-log"><h3>MISSION LOG</h3>{s.events.slice(0,5).map((event,i)=><p key={`${i}-${event}`}>{event}</p>)}</div>
   <footer>Same lander model in assembly and flight. Booster launch and transfer are assisted; descent uses finite thrust, fuel, and lunar gravity. Surface science readings are simulated. This mission ends on the Moon.</footer>
  </aside></div>
 </div>;
}
