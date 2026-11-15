// AI-assisted workshop. The selected blueprint and payload configuration travel together.
import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import MarsMission from './MarsMission';
import { MarsRover, DescentPlatform } from './MarsHardware';
import { createMarsMission } from './marsPhysics.js';
import { MARS_MODULES, DEFAULT_MARS_CONFIGURATION, PAYLOAD_PART_IDS, payloadStats, payloadChecks } from './marsConfiguration.js';
import './MarsAssembly.css';

function PayloadView({ configuration, HangarComponent }) {
  const flight=useRef(createMarsMission(configuration));
  flight.current.configuration=configuration;
  return <Canvas shadows camera={{position:[7,4.4,9],fov:43,near:.1,far:150}} dpr={[1,1.5]}>
    <HangarComponent/>
    <Suspense fallback={null}>
      <DescentPlatform flight={flight} configuration={configuration}/>
      <group position={[0,1.1,0]} scale={.72}><MarsRover preview configuration={configuration}/></group>
    </Suspense>
    <OrbitControls target={[0,1.5,0]} minDistance={4} maxDistance={20} maxPolarAngle={Math.PI/2.04}/>
  </Canvas>;
}

export default function MarsAssembly({onBack,RocketBuilder,RocketComponent,HangarComponent,parts}) {
  const [stage,setStage]=useState('rocket');
  const [blueprint,setBlueprint]=useState(null);
  const [configuration,setConfiguration]=useState({...DEFAULT_MARS_CONFIGURATION});
  const [name,setName]=useState('Ares Pathfinder');
  const [flying,setFlying]=useState(false);
  const [notice,setNotice]=useState('Add or remove modules. The same rover and landing hardware appear in your mission.');
  const payload=payloadStats(configuration),checks=payloadChecks(configuration);
  const core=(blueprint?.build||[]).filter(id=>!PAYLOAD_PART_IDS.has(id));
  const coreStats=core.map(id=>parts.find(part=>part.id===id)).filter(Boolean).reduce((s,p)=>({mass:s.mass+p.mass,fuel:s.fuel+(p.fuel||0),thrust:s.thrust+(p.thrust||0),cost:s.cost+p.cost}),{mass:0,fuel:0,thrust:0,cost:0});
  const stats={...coreStats,mass:coreStats.mass+payload.mass+payload.cruiseMass/1000,cost:coreStats.cost+payload.cost};
  const build=[...core,'rover',...(configuration.camera?['camera']:[]),...(configuration.scanner||configuration.arm?['science']:[]),...(configuration.shield?['shield']:[]),...(configuration.chute?['parachute']:[]),...(configuration.legs?['legs']:[]),...(configuration.antenna?['deepAntenna']:[])];
  const twr=stats.mass?stats.thrust/(stats.mass*9.81):0;
  const rocketHeight=core.map(id=>parts.find(part=>part.id===id)).filter(part=>part?.type==='tank').reduce((height,part)=>height+part.h,5.86);
  const ready=!!blueprint&&checks.every(check=>check.ok)&&payload.cost<=30000&&stats.cost<=75000&&twr>1.2;
  const change=(module,delta)=>setConfiguration(current=>({...current,[module.id]:Math.max(0,Math.min(module.max,(current[module.id]||0)+delta))}));
  const save=()=>{localStorage.setItem('mars-architecture-v2',JSON.stringify({blueprint,configuration,name}));setNotice('Rocket and payload blueprints saved together.');};
  const load=()=>{
    try {
      const saved=JSON.parse(localStorage.getItem('mars-architecture-v2')||'null');
      if(!saved?.blueprint?.build||!saved.configuration){setNotice('No complete saved Mars blueprint yet.');return;}
      setBlueprint(saved.blueprint);setConfiguration(saved.configuration);setName(saved.name||'Ares Pathfinder');setNotice('Both blueprints loaded. Review the equipment before launch.');
    } catch {setNotice('Could not load the saved blueprint.');}
  };
  if(flying) return <MarsMission name={name} build={build} stats={stats} checks={[...checks,{label:'Complete mission stack',ok:ready}]}
    mission={{name:'MARS EXPLORATION',destination:'MARS SURFACE'}} configuration={configuration} rocketHeight={rocketHeight}
    rocket={<RocketComponent mars build={build} configuration={configuration} selected={null} onSelect={()=>{}}/>}
    onBack={()=>{setFlying(false);setStage('review');}}/>;
  if(stage==='rocket') return <RocketBuilder mission="mars" onBack={onBack} initialBlueprint={blueprint}
    onContinue={vehicle=>{setBlueprint(vehicle);setName(vehicle.name);setStage('payload');}}/>;
  return <div className="vab-screen ma-workshop">
    <header className="vab-topbar"><div className="vab-brand">◇ MARS MISSION WORKSHOP</div><div className="vab-top-actions"><button onClick={save}>SAVE BOTH</button><button onClick={load}>LOAD BOTH</button><button onClick={onBack}>✕ EXIT</button></div></header>
    <nav className="ma-steps"><button onClick={()=>setStage('rocket')}>1 · BUILD ROCKET</button><button className={stage==='payload'?'active':''} onClick={()=>setStage('payload')}>2 · BUILD LANDER & ROVER</button><button className={stage==='review'?'active':''} onClick={()=>setStage('review')}>3 · REVIEW FULL STACK</button></nav>
    <main className="vab-main">
      <div className="vab-world">{stage==='payload'?<PayloadView configuration={configuration} HangarComponent={HangarComponent}/>:<Canvas shadows camera={{position:[7,8,12],fov:65,near:.1,far:150}} dpr={[1,1.5]}><HangarComponent/><Suspense fallback={null}><RocketComponent mars assembly build={build} configuration={configuration} selected={null} onSelect={()=>{}}/></Suspense><OrbitControls target={[0,6,0]} minDistance={7} maxDistance={45} maxPolarAngle={Math.PI/2.04}/></Canvas>}<div className="vab-hangar-caption">{stage==='payload'?'YOUR ACTUAL MARS PAYLOAD':'YOUR ROCKET + YOUR LANDER + YOUR ROVER'}</div></div>
      <aside className="vab-parts"><div className="vab-panel-title">{stage==='payload'?'LANDER & ROVER MODULES':'MISSION ARCHITECTURE'}</div>
        {stage==='payload'?<div className="ma-modules">{MARS_MODULES.map(module=><div className="ma-module" key={module.id}><b>{module.name}</b><small>{module.detail}</small><span>{configuration[module.id]||0} installed · {module.mass} kg · {module.cost} cr</span><div><button aria-label={`Remove ${module.name}`} disabled={!configuration[module.id]} onClick={()=>change(module,-1)}>− REMOVE</button><button aria-label={`Add ${module.name}`} disabled={configuration[module.id]>=module.max} onClick={()=>change(module,1)}>+ ADD</button></div></div>)}</div>:<div className="ma-description"><h3>ONE CONTINUOUS MISSION</h3><p>The reviewed rocket launches from the Earth pad using your existing throttle and pitch controls.</p><p>The same configured vehicle remains visible during Earth departure and Mars cruise. The rover capsule separates visibly before atmospheric entry.</p><p>Your selected landing thrusters, fuel, batteries and science equipment determine the descent and surface mission. The rover you built unfolds after touchdown.</p><p>New flights always start on Earth. A compatible saved mission can be resumed only through an explicit resume button.</p></div>}
      </aside>
      <aside className="vab-stats"><div className="vab-panel-title">MARS PAYLOAD CONFIGURATION</div><label className="vab-small-label">MISSION NAME</label><input className="vab-name" value={name} onChange={event=>setName(event.target.value)} maxLength={36}/>
        <div className="vab-section-title">COMBINED MISSION READOUT</div>
        {[['PAYLOAD WET MASS',`${payload.mass.toFixed(2)} t`],['LANDING PROPELLANT',`${payload.fuel} kg`],['TRANSFER RESERVE',`${payload.transferFuel} kg`],['LANDING THRUST',`${payload.thrust} kN`],['BATTERY CAPACITY',`${payload.battery} units`],['LIFTOFF MASS',`${stats.mass.toFixed(2)} t`],['EARTH LIFTOFF TWR',twr.toFixed(2)],['PAYLOAD BUDGET',`${payload.cost.toLocaleString()} / 30,000 cr`],['MISSION BUDGET',`${stats.cost.toLocaleString()} / 75,000 cr`]].map(([label,value])=><div className="vab-stat" key={label}><span>{label}</span><b>{value}</b></div>)}
        <div className="vab-section-title">PAYLOAD READINESS</div><div className="vab-readiness">{checks.map(check=><div key={check.id} className={`vab-check ${check.ok?'pass':'fail'}`}><span>{check.ok?'✓':'○'}</span>{check.label}</div>)}</div>
        <div className="vab-status">{notice}<p>Module masses and engineering performance are game approximations. NASA's rover model supplies the geometry; your installed equipment controls this simulation.</p></div>
      </aside>
    </main>
    <footer className="vab-toolbar"><div className="vab-toolbar-left"><button onClick={()=>setStage('rocket')}>← BUILD ROCKET</button><button onClick={()=>{setConfiguration({...DEFAULT_MARS_CONFIGURATION});setNotice('Default payload restored. You can change every module.');}}>RESET PAYLOAD</button><button onClick={()=>setConfiguration({})}>CLEAR PAYLOAD</button></div><button className="vab-launch" disabled={stage==='review'&&!ready} onClick={()=>stage==='payload'?setStage('review'):setFlying(true)}>{stage==='payload'?'NEXT → REVIEW FULL STACK':ready?'LAUNCH FROM EARTH →':'COMPLETE REQUIRED SYSTEMS'}</button></footer>
  </div>;
}
