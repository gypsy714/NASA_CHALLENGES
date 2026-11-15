import { useMissionIntegration } from './missionIntegration.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {CoastalLaunchSite,EarthAtmosphere,FlightLighting,LaunchVapour,SkyClouds,RecoveryCanopy,AltitudeStars,FlightSky} from './EarthEnvironment';
import * as THREE from 'three';
import {atmosphereAt,visualHeight,visualDownrange,flightShake,smoothRange,setLayerOpacity} from './earthVisualState.js';
import './LaunchPreparation.css';

// Educational 2D polar flight dynamics with an orbital-elements estimate. Not a validated aerospace simulator.
const G = 9.81, RHO = 1.225, SCALE = 0.012, EARTH_RADIUS = 6371000, MU = 3.986004418e14;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const fmt = (n,d=1) => Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
const initialFlight = (fuel, battery) => ({phase:'ready', time:0, altitude:0, vertical:0, horizontal:0, downrange:0, fuel, battery, throttle:100, pitch:90, heading:90, maxQ:0, q:0, engine:false, solar:false, payload:false, data:false, transmitted:false, parachute:false, parachuteArmed:false, stage:0, lastWarning:'', landed:false, failureReason:'', peakAltitude:0, apoapsis:0, periapsis:0, orbit:false, crossedSpace:false, maxSpeed:0, orbitAchieved:false, deorbitStarted:false, reentry:false, heat:0, warp:1, orbitAngle:0, orbitDemo:false, recoveryAttitude:false});

// Continuous altitude presentation; physics remains in metres in the mission below.
function EarthGlobe({flightRef,visualRef,earthRotation}) {
 const globe=useRef(),cloudLayer=useRef();
 const earthTexture=useMemo(()=>{const t=new THREE.TextureLoader().load('/textures/earth.jpg');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;},[]);
 const cloudTexture=useMemo(()=>{const t=new THREE.TextureLoader().load('/earth-clouds-real.png');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;},[]);
 useEffect(()=>()=>{earthTexture.dispose();cloudTexture.dispose();},[earthTexture,cloudTexture]);
 useFrame(({clock})=>{
  if(!globe.current)return;
  const v=visualRef.current,env=atmosphereAt(v.altitude),remote=v.remoteBlend;
  const x=visualDownrange(v.downrange),y=visualHeight(v.altitude);
  globe.current.position.set(x*(1-remote),(y-env.horizonDrop)*(1-remote),-170*remote);
  globe.current.scale.setScalar(1-.6*remote);
  globe.current.rotation.y=1.6+clock.elapsedTime*.0012+earthRotation.current;
  if(cloudLayer.current)cloudLayer.current.rotation.y=Math.PI*.2+clock.elapsedTime*.00035;
  setLayerOpacity(globe.current,(env.globe+(1-env.globe)*remote)*(1-v.overviewBlend));
 });
 return <group ref={globe}>
  <mesh renderOrder={-4} rotation={[0,Math.PI*.2,0]}><sphereGeometry args={[238,96,64]}/><meshStandardMaterial map={earthTexture} roughness={.84} metalness={.06}/></mesh>
  <mesh ref={cloudLayer} renderOrder={-3} rotation={[0,Math.PI*.2,0]}><sphereGeometry args={[239.3,96,64]}/><meshStandardMaterial map={cloudTexture} transparent opacity={.74} depthWrite={false} roughness={1}/></mesh>
  <EarthAtmosphere radius={242}/>
 </group>;
}

function OrbitOverview({flightRef,visualRef}) {
 const marker=useRef(),root=useRef();
 const texture=useMemo(()=>{const t=new THREE.TextureLoader().load('/textures/earth.jpg');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;},[]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 useFrame(()=>{setLayerOpacity(root.current,visualRef.current.overviewBlend*visualRef.current.remoteBlend);if(marker.current){const a=flightRef.current.orbitAngle,radius=38+Math.min(15,flightRef.current.altitude/100000);marker.current.position.set(radius*Math.sin(a),radius*Math.cos(a),4);}});
 return <group ref={root} position={[0,0,-170]}>
  <mesh rotation={[0,Math.PI*.2,0]}><sphereGeometry args={[36,64,48]}/><meshStandardMaterial map={texture} roughness={1}/></mesh>
  <mesh><sphereGeometry args={[37,48,32]}/><meshBasicMaterial color="#398dff" transparent opacity={.10} side={THREE.BackSide}/></mesh>
  <mesh><torusGeometry args={[44,.12,8,160]}/><meshBasicMaterial color="#7dc7f6" transparent opacity={.55}/></mesh>
  <group ref={marker}><mesh><sphereGeometry args={[2,16,12]}/><meshBasicMaterial color="#ffd27d"/></mesh><pointLight intensity={3} distance={15} color="#ffce7a"/></group>
 </group>;
}

export function FlightWorld({rocket,flightRef,cameraMode,onReport,captureRequest,onCaptured,earthRotation}) {
 const craft=useRef(),rocketRoot=useRef(),flame=useRef(),ground=useRef(),clouds=useRef();
 const [rocketHeight,setRocketHeight]=useState(8);
 const visualRef=useRef({altitude:flightRef.current.altitude,downrange:flightRef.current.downrange,remoteBlend:0,overviewBlend:0});
 const offset=useRef(new THREE.Vector3(12,7,24)),last=useRef(0);
 const {camera,scene,gl}=useThree();
 useEffect(()=>{if(!rocketRoot.current)return;rocketRoot.current.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});const bounds=new THREE.Box3().setFromObject(rocketRoot.current);if(!bounds.isEmpty())setRocketHeight(Math.max(4,bounds.max.y-(craft.current?.position.y||0)));},[rocket]);
 useFrame(({clock},rawDt)=>{
  const dt=Math.min(rawDt,.1),f=flightRef.current,v=visualRef.current,reset=['ready','countdown'].includes(f.phase);
  const fullEarth=cameraMode==='earth'&&f.altitude>=100000,overview=cameraMode==='overview'&&f.altitude>=30000;
  v.altitude=reset?f.altitude:THREE.MathUtils.damp(v.altitude,f.altitude,12,dt);
  v.downrange=reset?f.downrange:THREE.MathUtils.damp(v.downrange,f.downrange,12,dt);
  v.remoteBlend=reset?0:THREE.MathUtils.damp(v.remoteBlend,fullEarth||overview?1:0,1.8,dt);
  v.overviewBlend=THREE.MathUtils.damp(v.overviewBlend,overview?1:0,2.5,dt);
  const env=atmosphereAt(v.altitude),height=visualHeight(v.altitude),x=visualDownrange(v.downrange);
  if(craft.current){
   craft.current.position.set(x,height+1,0);
   const recovered=f.phase==='landed'||f.phase==='success';
   const angle=f.parachute||recovered?0:f.recoveryAttitude&&f.vertical<0?Math.atan2(-f.horizontal,f.vertical)+Math.PI:THREE.MathUtils.degToRad(90-f.pitch);
   if(recovered||reset)craft.current.rotation.z=angle;
   else if(f.parachute||f.recoveryAttitude){const difference=Math.atan2(Math.sin(angle-craft.current.rotation.z),Math.cos(angle-craft.current.rotation.z));craft.current.rotation.z+=difference*(1-Math.exp(-dt*2.5));}
   else craft.current.rotation.z=angle;
   setLayerOpacity(craft.current,1-v.remoteBlend);
  }
  const firing=f.engine&&f.fuel>0&&f.throttle>0&&f.phase==='flight';
  if(flame.current)flame.current.visible=firing;
  setLayerOpacity(ground.current,env.ground*(1-v.remoteBlend));
  setLayerOpacity(clouds.current,env.clouds*(1-v.remoteBlend));
  const sky=Math.max(env.darkness,v.remoteBlend),thinAir=smoothRange(sky,.8,1);
  scene.background=new THREE.Color('#c3dbe5').lerp(new THREE.Color('#020713'),sky);
  if(scene.fog){scene.fog.color.copy(scene.background).lerp(new THREE.Color('#d9e5ec'),env.immersion*.55);scene.fog.near=THREE.MathUtils.lerp(THREE.MathUtils.lerp(210,10,env.immersion),100000,thinAir);scene.fog.far=THREE.MathUtils.lerp(THREE.MathUtils.lerp(1500,170,env.immersion),200000,thinAir);}
  const tracking=new THREE.Vector3(x,height+(f.parachute?rocketHeight+2:rocketHeight*.55),0);
  const desiredOffset=cameraMode==='ground'?new THREE.Vector3(32,16,45):cameraMode==='orbit'?new THREE.Vector3(31,19,54):new THREE.Vector3(f.parachute?18:12,f.parachute?12:7,f.parachute?35:24);
  offset.current.lerp(desiredOffset,1-Math.exp(-dt*3));
  const followPosition=tracking.clone().add(offset.current);
  if(cameraMode==='ground'){const anchored=1-smoothRange(v.altitude,1000,2500);followPosition.lerp(new THREE.Vector3(x+30,14,42),anchored);}
  camera.position.copy(followPosition).lerp(new THREE.Vector3(0,0,110),v.remoteBlend);
  const look=tracking.clone().lerp(new THREE.Vector3(0,0,-170),v.remoteBlend);
  const shake=flightShake(f)*Math.pow(1-v.remoteBlend,3)*(cameraMode==='ground'?.3:1),t=clock.elapsedTime;
  camera.position.x+=shake*(Math.sin(t*24)+Math.sin(t*37)*.25);
  camera.position.y+=shake*.65*Math.sin(t*29);
  camera.lookAt(look);
  // Capture only after the cinematic camera has settled, avoiding transitional frames.
  if(captureRequest.current&&fullEarth&&v.remoteBlend>.997&&v.overviewBlend<.003){captureRequest.current=false;window.setTimeout(()=>{try{onCaptured(gl.domElement.toDataURL('image/png'),f.altitude,f.time);}catch{onCaptured(null,f.altitude,f.time);}},120);}
  if(clock.elapsedTime-last.current>.2){last.current=clock.elapsedTime;onReport({...f});}
 });
 return <>
  <fog attach="fog" args={['#8fc0dc',210,1500]}/>
  <FlightSky flightRef={flightRef} visualRef={visualRef}/><FlightLighting flightRef={flightRef} visualRef={visualRef}/>
  <group ref={ground}><CoastalLaunchSite rocketHeight={rocketHeight} flightRef={flightRef}/><LaunchVapour flightRef={flightRef}/></group>
  <group ref={clouds}><SkyClouds/></group>
  <EarthGlobe flightRef={flightRef} visualRef={visualRef} earthRotation={earthRotation}/>
  <OrbitOverview flightRef={flightRef} visualRef={visualRef}/>
  <group ref={craft}><group ref={rocketRoot}>{rocket}</group><RecoveryCanopy flightRef={flightRef} rocketHeight={rocketHeight}/><group ref={flame} visible={false} position={[0,1.15,0]}><pointLight position={[0,-1,0]} intensity={18} distance={20} color="#ff8e3b"/></group></group>
  <AltitudeStars flightRef={flightRef} visualRef={visualRef}/>
 </>;
}

function createFlightAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return {beep(){},ignite(){},stopEngine(){},close(){}};
  const ctx=new AC();let source=null,engineGain=null,closed=false;
  const beep=(freq=700,duration=.12)=>{
    if(closed)return;ctx.resume().catch(()=>{});
    const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
    osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.09,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(t+duration+.02);
  };
  const ignite=()=>{
    if(closed||source)return;ctx.resume().catch(()=>{});
    const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=380;
    engineGain=ctx.createGain();engineGain.gain.setValueAtTime(.0001,ctx.currentTime);engineGain.gain.setTargetAtTime(.10,ctx.currentTime,.5);
    source.connect(filter).connect(engineGain).connect(ctx.destination);source.start();
  };
  const setThrottle=(amount)=>{if(!closed&&engineGain)engineGain.gain.setTargetAtTime(amount>0?.025+Math.max(0,amount)/100*.12:.0001,ctx.currentTime,.15);};
  const stopEngine=()=>{if(!source)return;try{engineGain.gain.setTargetAtTime(.0001,ctx.currentTime,.12);source.stop(ctx.currentTime+.5);}catch{}source=null;engineGain=null;};
  const close=()=>{if(closed)return;closed=true;stopEngine();window.setTimeout(()=>ctx.close().catch(()=>{}),600);};
  return {beep,ignite,stopEngine,setThrottle,close};
}

function Navball({pitch,heading}){
  const offset=clamp((pitch-45)*.8,-35,35);
  return <div className="fo-navball"><svg viewBox="0 0 180 180" role="img" aria-label={`Attitude indicator pitch ${Math.round(pitch)} degrees`}>
    <defs><clipPath id="fo-ball"><circle cx="90" cy="90" r="65"/></clipPath></defs>
    <circle cx="90" cy="90" r="73" fill="#152a38" stroke="#64869a" strokeWidth="2"/>
    <g clipPath="url(#fo-ball)"><rect x="20" y="0" width="140" height={90+offset} fill="#28617e"/><rect x="20" y={90+offset} width="140" height="180" fill="#856444"/><line x1="20" y1={90+offset} x2="160" y2={90+offset} stroke="#dbeaf2" strokeWidth="2"/>
      {[-30,-15,15,30].map(i=><line key={i} x1="66" y1={90+offset+i} x2="114" y2={90+offset+i} stroke="#b6d2e3" opacity=".6"/>)}</g>
    <circle cx="90" cy="90" r="65" fill="none" stroke="#7292a5" strokeWidth="2"/>
    <path d="M42 90H76L90 100L104 90H138" fill="none" stroke="#ffc36c" strokeWidth="3"/>
    <path d="M90 15V28M90 152V165M15 90H28M152 90H165" stroke="#b7d7e8" strokeWidth="2"/>
    <text x="90" y="11" textAnchor="middle" fill="#d5e8f4" fontSize="10">{Math.round(heading).toString().padStart(3,'0')}</text>
  </svg></div>;
}

const PROCEDURES={
  power:{title:'LOW ELECTRICAL CHARGE',severity:'caution',detail:'Avionics and communications need electrical power.',hint:'Deploy solar arrays in sunlight or disable non-essential instruments. Solar arrays require the Solar Panel Pair installed in the VAB.'},
  powerCritical:{title:'ELECTRICAL POWER CRITICAL',severity:'critical',detail:'Flight computers may lose control and communications.',hint:'Deploy installed solar arrays and conserve power immediately. If none are installed, the mission may be unrecoverable.'},
  fuel:{title:'LOW PROPELLANT',severity:'caution',detail:'Main engine burn time is limited.',hint:'Reduce throttle or shut down the engine. Plan your remaining ascent carefully.'},
  empty:{title:'PROPELLANT DEPLETED',severity:'critical',detail:'Main engine cannot produce thrust.',hint:'The rocket now coasts under gravity. A new engine stage would require a separately configured stage in the VAB.'},
  q:{title:'HIGH DYNAMIC PRESSURE',severity:'caution',detail:'Aerodynamic loading is approaching the training limit.',hint:'Reduce throttle to lower aerodynamic stress. Pitch gently and avoid sudden turns.'},
  descent:{title:'UNCONTROLLED DESCENT',severity:'critical',detail:'Vertical velocity is negative and altitude is falling.',hint:'If propellant remains, raise pitch and apply throttle. Without enough thrust, recovery may be impossible.'},
  link:{title:'COMMUNICATIONS OFFLINE',severity:'critical',detail:'Electrical charge is depleted.',hint:'Deploy solar panels if installed. Ground commands and data transmission require electrical power.'}
};

// AI-assisted handoff: Mars reuses the existing Earth launch controls and audio.
export default function LaunchPreparation({mission,name='Explorer Mk I',build=[],stats={},checks=[],rocket,onBack,onMarsTransfer,onMarsResume}){
  const maxFuel=Math.max(0,Number(stats.fuel)||0),maxBattery=Math.max(80,build.filter(id=>id==='battery').length*160+120);
  const hasSolar=build.includes('solar'),hasCamera=build.includes('camera'),hasAntenna=build.includes('antenna')||build.includes('deepAntenna'),hasParachute=build.includes('parachute');
  const [photos,setPhotos]=useState([]),captureRequest=useRef(false),earthRotation=useRef(0);
  const [earthAngle,setEarthAngle]=useState(0);
  const rotateEarth=(degrees)=>{setEarthAngle(prev=>{const next=(prev+degrees+360)%360;earthRotation.current=next*Math.PI/180;return next;});};
  const [phase,setPhase]=useState('ready'),[count,setCount]=useState(10),[cameraMode,setCameraMode]=useState('follow');
  const [warp,setWarp]=useState(1);
  const [telemetry,setTelemetry]=useState(()=>initialFlight(maxFuel,maxBattery));
  const [tab,setTab]=useState('flight'),[guidance,setGuidance]=useState(true),[messages,setMessages]=useState([{t:'T+00:00',text:'Flight operations standing by. Verify readiness before launch.'}]);
  const flightRef=useRef(initialFlight(maxFuel,maxBattery)),timer=useRef(null),audio=useRef(null),clock=useRef(null),lastTick=useRef(null),lastAlert=useRef('');
  const onCaptured=useCallback((url,altitude,time)=>{if(url){flightRef.current.data=true;flightRef.current.battery=Math.max(0,flightRef.current.battery-4);setTelemetry({...flightRef.current});setPhotos(prev=>[{url,altitude,time,id:Date.now()},...prev].slice(0,5));setMessages(prev=>[{t:'CAMERA',text:'Earth photo saved in the observation gallery.'},...prev]);}else{setMessages(prev=>[{t:'CAMERA',text:'Snapshot failed. Please retry in FULL EARTH VIEW.'},...prev]);}},[]);
  const missionName=typeof mission==='string'?mission:mission?.name||'SPACE MISSION';
  const destination=typeof mission==='object'?mission?.destination||'SPACE':'SPACE';
  const allReady=checks.length>0&&checks.every(c=>c.ok)&&maxFuel>0&&(Number(stats.thrust)||0)>0;
  const log=useCallback((text)=>setMessages(prev=>[{t:`T+${String(Math.floor(flightRef.current.time/60)).padStart(2,'0')}:${String(Math.floor(flightRef.current.time%60)).padStart(2,'0')}`,text},...prev].slice(0,18)),[]);
  const utterances=useRef(new Set()),alertTimes=useRef(new Map());
  const speak=useCallback((text,interrupt=false,onDone,rate=1.12)=>{
    if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance)return false;
    try {const synth=window.speechSynthesis;if(interrupt){utterances.current.clear();synth.cancel();}
      const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=rate;u.pitch=.94;u.volume=1;
      const voices=synth.getVoices();const english=voices.find(v=>v.lang?.toLowerCase().startsWith('en')&&v.localService)||voices.find(v=>v.lang?.toLowerCase().startsWith('en'));
      if(english)u.voice=english;
      // Retain utterances until completion; some browser voices otherwise stop early.
      utterances.current.add(u);
      u.onend=()=>{if(utterances.current.delete(u))onDone?.();};
      u.onerror=e=>{const active=utterances.current.delete(u);if(!['canceled','interrupted'].includes(e.error))console.warn('Speech failed:',e.error);if(active)onDone?.();};
      synth.speak(u);if(synth.paused)synth.resume();return true;
    }catch(e){console.warn('Speech unavailable:',e);return false;}
  },[]);
  const setFlight=(patch)=>{Object.assign(flightRef.current,patch);setTelemetry({...flightRef.current});};
  const endAudio=useCallback(()=>{if(timer.current){clearInterval(timer.current);timer.current=null;}if(clock.current){clearInterval(clock.current);clock.current=null;}utterances.current.clear();window.speechSynthesis?.cancel();audio.current?.close();audio.current=null;},[]);
  useEffect(()=>()=>endAudio(),[endAudio]);
  const warn=useCallback((key)=>{
    const now=Date.now(),previous=alertTimes.current.get(key);
    if(previous!==undefined&&now-previous<30000)return;
    alertTimes.current.set(key,now);
    lastAlert.current=key;const p=PROCEDURES[key];if(!p)return;
    log(p.title+' — '+p.hint);audio.current?.beep(p.severity==='critical'?420:590,.26);speak(`Flight control. ${p.title.toLowerCase()}. ${p.hint.split('.')[0]}.`);
  },[log,speak]);
  const tick=useCallback(()=>{
    const f=flightRef.current;if(f.phase!=='flight')return;
    // Fixed 0.1 s substeps retain stable integration at 5x/20x time acceleration.
    for(let sub=0;sub<(f.warp||1);sub++){
    if(f.phase!=='flight')break;
    const dt=.1;f.time+=dt;
    f.peakAltitude=Math.max(f.peakAltitude,f.altitude);
    const fuelFraction=maxFuel?f.fuel/maxFuel:0;
    // Approximate dry mass from the VAB wet mass; propellant is expended during burns.
    const wetMass=Math.max(400,Number(stats.mass||1)*1000);
    const propMass=wetMass*.74;
    const massKg=Math.max(400,wetMass-(1-fuelFraction)*propMass);
    const r=EARTH_RADIUS+f.altitude;
    const rho=RHO*Math.exp(-f.altitude/8500),v=Math.hypot(f.vertical,f.horizontal);
    f.q=.5*rho*v*v/1000;f.maxQ=Math.max(f.maxQ,f.q);f.maxSpeed=Math.max(f.maxSpeed,v);
    audio.current?.setThrottle?.(f.engine?f.throttle:0);
    const thrust=(f.engine&&f.fuel>0&&f.battery>0)?(Number(stats.thrust)||0)*1000*f.throttle/100:0;
    // Burn rate is tied to thrust and an assumed effective exhaust velocity (Isp ~345s (gameplay-tuned)).
    const burn=thrust>0?(thrust/(345*G))*(maxFuel/Math.max(propMass,1))*dt:0;
    f.fuel=Math.max(0,f.fuel-burn);
    const angle=f.pitch*Math.PI/180;
    const drag=.5*rho*v*v*3.5*.36/massKg;
    const ax=thrust/massKg*Math.cos(angle)-drag*(f.horizontal/(v||1))-f.horizontal*f.vertical/r;
    const ay=thrust/massKg*Math.sin(angle)-MU/(r*r)-drag*(f.vertical/(v||1))+(f.horizontal*f.horizontal/r);
    f.horizontal+=ax*dt;f.vertical+=ay*dt;
    // Give the player time to recover; high warp must not skip the landing window.
    if(f.vertical<0&&f.altitude<=10000&&f.warp>1&&!f.parachute){
      f.warp=1;setWarp(1);log('Recovery approach — time warp reduced to 1× below 10 km.');
    }
    // Arming is a persistent request. Deployment still respects speed and altitude limits.
    if(hasParachute&&f.parachuteArmed&&!f.parachute&&f.vertical<0&&f.altitude<=5000&&Math.hypot(f.vertical,f.horizontal)<=350){
      f.parachute=true;f.parachuteArmed=false;f.recoveryAttitude=true;f.pitch=90;
      f.engine=false;audio.current?.stopEngine();f.warp=1;setWarp(1);
      log('Recovery parachute deployed automatically — descent stabilized.');
      speak('Recovery parachute deployed.');
    }
    // Simplified parachute descent assistance, not a full thermal re-entry model.
    if(f.parachute&&f.vertical<0&&f.altitude<=5000){f.vertical=Math.max(f.vertical,-6.5);f.horizontal*=.95;}

    f.downrange+=f.horizontal*dt*EARTH_RADIUS/r;
    f.orbitAngle+=f.horizontal*dt/r;
    f.altitude=Math.max(0,f.altitude+f.vertical*dt);
    // Orbital elements for the simplified two-dimensional, non-rotating Earth model.
    const rr=EARTH_RADIUS+f.altitude, vv=f.vertical*f.vertical+f.horizontal*f.horizontal;
    const energy=vv/2-MU/rr, h=rr*f.horizontal;
    const ecc=Math.sqrt(Math.max(0,1+2*energy*h*h/(MU*MU)));
    const pOrbit=h*h/MU;
    f.periapsis=pOrbit/(1+ecc)-EARTH_RADIUS;
    f.apoapsis=energy<0?(-MU/(2*energy))*(1+ecc)-EARTH_RADIUS:Infinity;
    f.orbit=f.periapsis>=100000&&Number.isFinite(f.apoapsis)&&f.apoapsis<2000000;
    if(f.orbit&&!f.orbitAchieved){f.orbitAchieved=true;log('ORBIT CONFIRMED — periapsis above 100 km. Circularization complete.');speak('Mission control. Stable orbit confirmed.');}
    if(f.deorbitStarted&&f.altitude<80000)f.reentry=true;
    // A simplified thermal stress indicator; the model does not solve heat flux or ablation.
    f.heat=Math.min(100,Math.max(0, f.q*Math.hypot(f.vertical,f.horizontal)/18000));
    if(f.altitude>=100000&&!f.crossedSpace){f.crossedSpace=true;log('KÁRMÁN LINE CROSSED — 100 km above sea level. Orbit is not yet confirmed.');speak('Mission control. Explorer has reached space. Orbital insertion remains pending.');}
    const drain=(.04+(f.engine?.045:0)+(f.payload?.05:0))*dt;
    const charge=f.solar&&hasSolar? .23*dt:0;
    f.battery=clamp(f.battery-drain+charge,0,maxBattery);
    if(f.fuel<=0&&f.engine){f.engine=false;audio.current?.stopEngine();warn('empty');}
    if(f.battery<=0&&f.engine){f.engine=false;audio.current?.stopEngine();warn('link');}
    if(maxFuel>0&&f.fuel/maxFuel<.2&&f.fuel>0&&!f.deorbitStarted&&!f.parachute)warn('fuel');
    if(f.battery/maxBattery<.08&&f.battery>0)warn('powerCritical');
    else if(f.battery/maxBattery<.2&&f.battery>0)warn('power');
    if(f.q>32)warn('q');
    if(f.vertical< -18&&f.altitude>100&&!f.deorbitStarted&&!f.parachute)warn('descent');
    if(f.altitude===0&&f.time>1){
      const safe=f.peakAltitude>2 && f.vertical>=-8 && Math.abs(f.horizontal)<20 && f.parachute;
      f.phase=safe?(f.transmitted?'success':'landed'):'failed';
      f.failureReason=safe?'Safe touchdown confirmed.':f.peakAltitude<=2?'Launch failed: insufficient thrust to leave the pad.':f.parachuteArmed&&!f.parachute?'Return speed stayed above the 350 m/s parachute limit. Use a lighter recovery vehicle or a slower entry.':'Vehicle impacted the ground without a safe landing.';
      f.engine=false;audio.current?.stopEngine();setPhase(f.phase);
      log(f.phase==='success'?'MISSION SUCCESS — science transmitted and spacecraft recovered.':f.phase==='failed'?'MISSION FAILED — '+f.failureReason:'Safe landing achieved, but science data not transmitted.');
      speak(f.phase==='success'?'Mission success. Science received and vehicle safely recovered.':f.phase==='failed'?'Mission control. Vehicle lost. Mission failed.':'Mission control. Vehicle safely on the surface.');
      clearInterval(clock.current);clock.current=null;
    }
    // Engine-off craft keeps falling under gravity. An unpowered craft is never frozen in midair.
    if(f.altitude>100 && f.vertical< -18 && f.battery===0 && f.fuel===0 && !f.deorbitStarted && !f.parachute)warn('descent');
    } // end fixed time-warp substeps
    setTelemetry({...f});
  },[maxFuel,maxBattery,stats.mass,stats.thrust,hasSolar,hasParachute,log,speak,warn]);
  const begin=()=>{
    if(!allReady||flightRef.current.phase!=='ready')return;
    audio.current=createFlightAudio();flightRef.current.phase='countdown';setPhase('countdown');setCount(10);log('Launch sequence armed. T minus ten seconds.');
    const numbers=['','One.','Two.','Three.','Four.','Five.','Six.','Seven.','Eight.','Nine.','Ten.'];
    // Advance only when this number has finished speaking AND its minimum display time has elapsed.
    // Slow Windows voices stretch the countdown instead of building a speech backlog.
    const countdownStep=(n)=>{
      if(flightRef.current.phase!=='countdown')return;
      if(n===0){
        timer.current=null;setCount(0);
        flightRef.current.phase='flight';flightRef.current.engine=true;setPhase('flight');
        audio.current?.beep(1300,.35);audio.current?.ignite();
        speak('Ignition. Liftoff.',true);log('LIFTOFF confirmed. Manual flight controls available.');
        clock.current=setInterval(tick,100);return;
      }
      setCount(n);audio.current?.beep(n<=3?990:700,.12);
      const started=Date.now();let completed=false;
      const finish=()=>{
        if(completed||flightRef.current.phase!=='countdown')return;
        completed=true;clearTimeout(timer.current);
        timer.current=setTimeout(()=>countdownStep(n-1),Math.max(0,700-(Date.now()-started)));
      };
      // Recover from a browser voice that emits neither end nor error.
      timer.current=setTimeout(()=>{
        if(completed||flightRef.current.phase!=='countdown')return;
        // Mark completion before cancel: cancellation may synchronously emit an error.
        finish();window.speechSynthesis?.cancel();utterances.current.clear();
      },5000);
      if(!speak(numbers[n],n===10,finish,1.8))finish();
    };
    countdownStep(10);
  };
  const reset=()=>{endAudio();captureRequest.current=false;setPhotos([]);earthRotation.current=0;setEarthAngle(0);lastAlert.current='';alertTimes.current.clear();flightRef.current=initialFlight(maxFuel,maxBattery);setTelemetry({...flightRef.current});setPhase('ready');setCameraMode('follow');setWarp(1);setCount(10);setMessages([{t:'T+00:00',text:'Launch simulation reset. Vehicle ready for checks.'}]);};
  const leave=()=>{endAudio();onBack?.();};
  const command=(action)=>{
    const f=flightRef.current;if(f.phase!=='flight')return;
    if(action==='cut'){f.engine=false;audio.current?.stopEngine();log('Engine cutoff commanded.');}
    if(action==='ignite'){if(f.parachute){log('Engine restart blocked while recovery parachute is open.');return;}f.warp=1;setWarp(1);if(f.fuel<=0||f.battery<=0){log('Engine restart rejected: insufficient fuel or electrical power.');return;}f.engine=true;audio.current?.ignite();log('Main engine ignition commanded.');}
    if(action==='solar'){if(!hasSolar){log('No solar arrays installed. Return to the VAB to add Solar Panel Pair.');return;}f.solar=!f.solar;log(`Solar arrays ${f.solar?'deployed':'retracted'}.`);}
    if(action==='payload'){if(cameraMode!=='earth'){log('Switch to FULL EARTH VIEW first to operate the imaging payload.');return;}if(!hasCamera){log('Earth imaging camera is not installed.');return;}if(f.altitude<100000){log('Payload operation requires reaching 100 km altitude.');return;}if(f.battery<=0){log('Payload operation rejected: no electrical power.');return;}f.payload=true;log('Imaging payload activated.');}
    if(action==='capture'){if(cameraMode!=='earth'||f.altitude<100000){log('Full-Earth camera view must be active above 100 km before capture.');return;}if(photos.length>=5){log('Gallery full: maximum five observations per mission.');return;}if(captureRequest.current){log('Please wait for the current snapshot.');return;}if(!f.payload||f.battery<5){log('Activate the imaging payload and maintain electrical charge first.');return;}captureRequest.current=true;log('Capturing the visible full-Earth camera frame...');speak('Earth observation camera active.');}
    if(action==='parachute'){
      if(!hasParachute){log('No parachute installed. Add Recovery Parachute in the VAB before launch.');return;}
      if(f.parachute||f.parachuteArmed)return;
      f.parachuteArmed=true;
      log('Recovery parachute ARMED — will open automatically during descent at or below 5 km and 350 m/s.');
      speak('Recovery parachute armed. Automatic deployment when safe.');
    }
    if(action==='orbitDemo'){
      if(f.altitude<100000||f.altitude>500000||f.vertical< -50){log('Orbit training requires altitude between 100 and 500 km while not rapidly descending.');return;}
      if(f.engine){log('Cut off the engine before using the optional orbit demonstration.');return;}
      // Clearly labeled educational assist: sets an ideal circular state, NOT earned delta-v.
      f.vertical=0;f.horizontal=Math.sqrt(MU/(EARTH_RADIUS+f.altitude));f.orbitDemo=true;
      f.deorbitStarted=false;f.recoveryAttitude=false;f.warp=1;setWarp(1);
      log('TRAINING ASSIST — ideal circular orbit injected. This bypasses real launch delta-v requirements.');
      speak('Mission control. Training orbit established. Earth observation may begin.');
    }
    if(action==='deorbitDemo'){
      if(!f.orbit||f.deorbitStarted){log('Enter orbit before starting a training deorbit.');return;}
      setCameraMode('follow');f.horizontal=Math.max(0,f.horizontal-150);f.deorbitStarted=true;f.recoveryAttitude=true;f.orbitDemo=true;
      log('TRAINING DEORBIT ASSIST — planned return initiated; recovery attitude engaged.');
    }
    if(action==='deorbit'){
      if(!f.orbit||f.deorbitStarted){log('A stable orbit is required for the deorbit burn.');return;}
      const wetMass=Math.max(400,Number(stats.mass||1)*1000),propMass=wetMass*.74;
      const currentMass=Math.max(400,wetMass-(1-f.fuel/Math.max(1,maxFuel))*propMass);
      const requiredDeltaV=150;const requiredMass=currentMass*(1-Math.exp(-requiredDeltaV/(345*G)));
      const fuelUnits=requiredMass/Math.max(propMass,1)*maxFuel;
      if(f.fuel<fuelUnits){log('Not enough fuel for a 150 m/s retrograde burn. Recovery may be impossible.');return;}
      setCameraMode('follow');f.fuel-=fuelUnits;f.horizontal=Math.max(0,f.horizontal-requiredDeltaV);f.deorbitStarted=true;f.recoveryAttitude=true;
      log('DEORBIT BURN COMPLETE — planned descent initiated. Recovery attitude engaged; monitor periapsis and parachute conditions.');
      speak('Deorbit burn complete. Prepare for atmospheric entry.');
    }
    if(action==='transmit'){if(!f.data||!hasAntenna||f.battery<8){log('Transmission requires captured data, antenna, and at least 8 electrical units.');return;}f.transmitted=true;f.battery-=8;log('Science data transmitted to ground. Training objective complete.');speak('Mission control confirms receipt of science data. Mission objective complete.');}
    setTelemetry({...f});
  };
  useMissionIntegration(onMarsTransfer?'mars-launch':'earth',name,{...telemetry,phase},(action,value)=>{
    const f=flightRef.current;
    if(action==='throttle'&&f.phase==='flight')setFlight({throttle:Math.max(0,Math.min(100,value))});
    else if(action==='pitch'&&f.phase==='flight')setFlight({pitch:Math.max(-10,Math.min(100,value))});
    else command(action);
  },{record:!onMarsTransfer,photos:photos.length});
  useEffect(()=>{
    const down=e=>{
      if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey)return;
      if(['1','2','3','4','5'].includes(e.key)){if(e.key==='4'&&flightRef.current.altitude<100000)return;if(e.key==='5'&&flightRef.current.altitude<30000)return;setCameraMode(['follow','ground','orbit','earth','overview'][Number(e.key)-1]);return;}
      const f=flightRef.current;if(f.phase!=='flight')return;
      if(['w','s','a','d','x','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();
      const k=e.key.toLowerCase();
      if(k==='w'||e.key==='ArrowUp')f.throttle=clamp(f.throttle+5,0,100);
      if(k==='s'||e.key==='ArrowDown')f.throttle=clamp(f.throttle-5,0,100);
      if(k==='a')f.pitch=clamp(f.pitch-3,0,90);
      if(k==='d')f.pitch=clamp(f.pitch+3,0,90);
      if(k==='x')command('cut');
      setTelemetry({...f});
    };
    window.addEventListener('keydown',down);return ()=>window.removeEventListener('keydown',down);
  });
  useEffect(()=>{
    if(phase==='flight'&&telemetry.vertical<0&&telemetry.altitude<120000&&['earth','overview'].includes(cameraMode))setCameraMode('follow');
  },[phase,telemetry.vertical,telemetry.altitude,cameraMode]);
  const warning=useMemo(()=>{
    if(telemetry.phase!=='flight')return null;
    if(telemetry.battery<=0)return PROCEDURES.link;
    if(telemetry.battery/maxBattery<.08)return PROCEDURES.powerCritical;
    if(telemetry.fuel<=0&&!telemetry.deorbitStarted)return PROCEDURES.empty;
    if(telemetry.vertical< -18&&telemetry.altitude>100&&!telemetry.deorbitStarted&&!telemetry.parachute)return PROCEDURES.descent;
    if(telemetry.q>32)return PROCEDURES.q;
    if(telemetry.battery/maxBattery<.2)return PROCEDURES.power;
    if(maxFuel>0&&telemetry.fuel/maxFuel<.2&&!telemetry.deorbitStarted&&!telemetry.parachute)return PROCEDURES.fuel;
    return null;
  },[telemetry,maxBattery,maxFuel]);
  const fuelPct=maxFuel?telemetry.fuel/maxFuel*100:0,powerPct=telemetry.battery/maxBattery*100;
  const missionTasks=[{name:'Launch vehicle',done:telemetry.time>1},{name:'Reach space (100 km)',done:telemetry.crossedSpace},{name:'Establish orbit (optional training challenge)',done:telemetry.orbitAchieved},{name:'Activate imaging payload',done:telemetry.payload},{name:'Capture full-Earth observation',done:telemetry.data},{name:'Transmit science data',done:telemetry.transmitted},{name:'Return and land safely',done:phase==='success'}];
  return <div className="fo-screen">
    <header className="fo-header"><div className="fo-brand">◇ MISSION CONTROL <small>/ FLIGHT OPERATIONS</small></div><div className="fo-header-center">{missionName} <span>·</span> {destination}</div><button className="fo-back" onClick={leave}>← BACK TO ASSEMBLY</button></header>
    <div className="fo-layout">
      <main className="fo-stage">
        <Canvas shadows camera={{position:[13,10,23],fov:49,near:.1,far:2500}} dpr={[1,1.5]} gl={{antialias:true,preserveDrawingBuffer:true}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;gl.shadowMap.type=THREE.PCFSoftShadowMap;}}><FlightWorld rocket={rocket} flightRef={flightRef} cameraMode={cameraMode} onReport={setTelemetry} captureRequest={captureRequest} onCaptured={onCaptured} earthRotation={earthRotation}/></Canvas>
        <div className="fo-cam-top"><strong>LC-01 / LIVE FLIGHT</strong><span className="fo-live">● {phase==='flight'?'TELEMETRY ACTIVE':'STANDBY'}</span></div>
        <div className="fo-cam-controls" aria-label="Camera selection">{[['follow','1','FOLLOW'],['ground','2','GROUND'],['orbit','3','CHASE WIDE'],['earth','4','FULL EARTH'],['overview','5','ORBIT VIEW']].map(([id,key,label])=><button key={id} disabled={(id==='earth'&&telemetry.altitude<100000)||(id==='overview'&&telemetry.altitude<30000)} className={cameraMode===id?'active':''} onClick={()=>setCameraMode(id)}><kbd>{key}</kbd> {label}</button>)}</div>
        {phase==='flight'&&telemetry.altitude>30000&&cameraMode!=='earth'&&cameraMode!=='overview'&&<div className="fo-orbit-map" aria-label="Live Earth orbit position diagram"><div className="fo-map-title">EARTH TRACKING · LIVE</div><svg viewBox="0 0 220 190" role="img" aria-label={`Spacecraft travelled ${Math.abs(telemetry.orbitAngle*180/Math.PI).toFixed(1)} degrees around Earth`}><circle cx="110" cy="99" r="72" fill="none" stroke="#567c97" strokeDasharray="4 5" strokeWidth="1.5"/><circle cx="110" cy="99" r="55" fill="#124b83" stroke="#72c8f3" strokeWidth="2"/><path d="M72 79L96 63 111 75 106 96 88 107 76 97Z M122 113L141 99 151 117 132 139 116 129Z M119 60L136 69 147 83 130 90Z" fill="#468c6d" opacity=".9"/><path d="M55 99H165 M110 44V154" stroke="#ffffff" strokeOpacity=".12"/><circle cx={110+72*Math.sin(telemetry.orbitAngle)} cy={99-72*Math.cos(telemetry.orbitAngle)} r="6" fill="#ffd08b" stroke="white" strokeWidth="2"/><path d={`M110 99 L${110+72*Math.sin(telemetry.orbitAngle)} ${99-72*Math.cos(telemetry.orbitAngle)}`} stroke="#a3dfff" strokeDasharray="3 4" strokeWidth="1.5"/><text x="110" y="104" textAnchor="middle" fill="#d7f4ff" fontSize="11">EARTH</text></svg><div className="fo-map-footer"><span>ARC {Math.abs(telemetry.orbitAngle*180/Math.PI).toFixed(1)}°</span><span>{telemetry.orbit?'ORBITING':telemetry.deorbitStarted?'RETURNING':'ASCENT'}</span></div><small>Position follows actual simulated horizontal travel. Pitch controls thrust direction; motion needs engine thrust and time.</small></div>}
        {phase==='countdown'&&<div className="fo-overlay"><small>LAUNCH SEQUENCE</small><strong>T−{count}</strong><span>ALL SYSTEMS NOMINAL</span></div>}
        {phase==='success'&&<div className="fo-failure fo-mission-success"><small>MISSION CONTROL / RECOVERY CONFIRMED</small><strong>MISSION SUCCESS</strong><p>Earth observation transmitted and spacecraft safely recovered!</p><span>Open OBJECTIVES to review saved snapshots.</span><button onClick={reset}>↻ NEW MISSION</button></div>}
        {phase==='failed'&&<div className="fo-failure"><small>MISSION CONTROL / FLIGHT TERMINATED</small><strong>MISSION FAILED</strong><p>{telemetry.failureReason||'Vehicle lost during ascent.'}</p><span>Review vehicle design and flight commands, then retry.</span><button onClick={reset}>↻ RETRY LAUNCH</button></div>}
        {phase==='flight'&&telemetry.time<4&&<div className="fo-liftoff">LIFTOFF <span>ASCENT INITIATED</span></div>}
        {cameraMode==='earth'&&<div className="fo-earth-rotate"><span>EARTH VIEW · {Math.round(earthAngle)}°</span><button onClick={()=>rotateEarth(-25)} aria-label="Rotate Earth left">↶ ROTATE LEFT</button><button onClick={()=>rotateEarth(25)} aria-label="Rotate Earth right">ROTATE RIGHT ↷</button></div>}
        {cameraMode==='overview'&&<div className="fo-earth-label">ORBIT VIEW · LIVE SPACECRAFT POSITION <small>Movement follows simulated orbital angle; pitch changes thrust direction, not velocity instantly</small></div>}
        {cameraMode==='earth'&&<div className="fo-earth-label">FULL EARTH VIEW · CINEMATIC REMOTE CAMERA · UNLOCKED AT 100 KM <small>Zoomed-out view — not the spacecraft's natural field of view at this altitude</small></div>}
        <div className="fo-bottom-strip"><span>CAM {cameraMode.toUpperCase()}</span><span>ALT {fmt(telemetry.altitude/1000,2)} km</span><span>V/S {fmt(telemetry.vertical)} m/s</span><span>ARC {Math.abs(telemetry.orbitAngle*180/Math.PI).toFixed(1)}°</span><span>WARP {warp}×</span><span>MET {String(Math.floor(telemetry.time/60)).padStart(2,'0')}:{String(Math.floor(telemetry.time%60)).padStart(2,'0')}</span></div>
      </main>
      <aside className="fo-sidebar">
        <div className="fo-vehicle"><div><small>ACTIVE VEHICLE</small><strong>{name}</strong></div><span className={`fo-status ${['landed','failed'].includes(phase)?'bad':''}`}>{phase==='ready'?'ON PAD':phase==='countdown'?'COUNTDOWN':phase==='flight'?(telemetry.parachute?'PARACHUTE DESCENT':telemetry.vertical<0?(telemetry.altitude>=100000?'RETURNING':'REENTRY'):telemetry.altitude>=100000?'IN SPACE':'ASCENDING'):phase==='failed'?'MISSION FAILED':phase==='success'?'MISSION SUCCESS':'FLIGHT ENDED'}</span></div>
        <div className="fo-tabs"><button className={tab==='flight'?'active':''} onClick={()=>setTab('flight')}>FLIGHT</button><button className={tab==='systems'?'active':''} onClick={()=>setTab('systems')}>SYSTEMS</button><button className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}>OBJECTIVES</button></div>
        <div className="fo-scroll">
          {tab==='flight'&&<>
            <div className="fo-section-title">FLIGHT DYNAMICS <span>FD-01</span></div>
            <div className="fo-readouts"><div><small>ALTITUDE</small><b>{fmt(telemetry.altitude/1000,3)} <em>km</em></b></div><div><small>VERTICAL VELOCITY</small><b>{fmt(telemetry.vertical)} <em>m/s</em></b></div><div><small>DOWNRANGE</small><b>{fmt(telemetry.downrange/1000,2)} <em>km</em></b></div><div><small>DYNAMIC PRESSURE</small><b className={telemetry.q>32?'fo-amber':''}>{fmt(telemetry.q,2)} <em>kPa</em></b></div></div>
            <div className="fo-section-title">ORBITAL SOLUTION <span>2D MODEL</span></div><div className="fo-readouts"><div><small>APOAPSIS</small><b>{telemetry.phase==='ready'?'—':Number.isFinite(telemetry.apoapsis)?fmt(telemetry.apoapsis/1000,1):'ESCAPE'} <em>km</em></b></div><div><small>PERIAPSIS</small><b className={telemetry.periapsis<100000?'fo-amber':''}>{telemetry.phase==='ready'?'—':fmt(telemetry.periapsis/1000,1)} <em>km</em></b></div><div><small>HORIZONTAL SPEED</small><b>{fmt(telemetry.horizontal/1000,2)} <em>km/s</em></b></div><div><small>ORBIT STATUS</small><b style={{fontSize:13,color:telemetry.orbit?'#68d8a6':'#ffcb7d'}}>{telemetry.orbit?'STABLE LEO':'NOT IN ORBIT'}</b></div></div><div className="fo-orbit-assist"><b>ORBITAL FLIGHT TRAINING</b><p>For a real orbit, pitch toward 0° and accelerate sideways to about 7.8 km/s. Your current single-stage rocket may not have enough delta-v. The optional orbit demo inserts a circular orbit without consuming the required fuel.</p><button disabled={phase!=='flight'||telemetry.altitude<100000||telemetry.altitude>500000||telemetry.engine||telemetry.orbit} onClick={()=>command('orbitDemo')}>ENTER CIRCULAR ORBIT — TRAINING ASSIST</button><small>{telemetry.orbitDemo?'TRAINING ORBIT ACTIVE · NOT AN EARNED LAUNCH':'Manual orbit remains possible with sufficient thrust and fuel'}</small></div><div className="fo-section-title">ATTITUDE / MANUAL GUIDANCE</div>
            <div className="fo-attitude"><Navball pitch={telemetry.pitch} heading={telemetry.heading}/><div className="fo-attitude-data"><small>PITCH</small><b>{Math.round(telemetry.pitch)}°</b><small>HEADING</small><b>{Math.round(telemetry.heading)}°</b><small>FLIGHT MODE</small><b>{telemetry.parachute?'AUTO · UPRIGHT LANDING':telemetry.recoveryAttitude?'AUTO · HEAT SHIELD FIRST':'MANUAL'}</b></div></div>
            <div className="fo-section-title">FLIGHT COMMANDS</div><div className="fo-warp"><span>TIME WARP</span>{[1,5,20].map(n=><button key={n} className={warp===n?'active':''} disabled={phase!=='flight'||(n>1&&telemetry.engine)|| (n>1&&telemetry.altitude<10000&&!telemetry.parachute)} onClick={()=>{flightRef.current.warp=n;setWarp(n);}}>{n}×</button>)}</div>
            <div className="fo-control"><div className="fo-control-head"><label htmlFor="fo-throttle">MAIN ENGINE THROTTLE</label><b>{Math.round(telemetry.throttle)}%</b></div><input id="fo-throttle" type="range" min="0" max="100" step="5" value={telemetry.throttle} disabled={phase!=='flight'} onChange={e=>setFlight({throttle:Number(e.target.value)})}/><div className="fo-control-head"><label htmlFor="fo-pitch">PITCH ATTITUDE</label><b>{Math.round(telemetry.pitch)}°</b></div><input id="fo-pitch" type="range" min="0" max="90" step="3" value={telemetry.pitch} disabled={phase!=='flight'} onChange={e=>setFlight({pitch:Number(e.target.value)})}/></div>
            <div className="fo-command-row"><button disabled={phase!=='flight'||telemetry.engine||telemetry.parachute} onClick={()=>command('ignite')}>◆ ENGINE START</button><button className="fo-danger" disabled={phase!=='flight'||!telemetry.engine} onClick={()=>command('cut')}>■ CUTOFF <kbd>X</kbd></button></div>
            <div className="fo-keyhelp">W/S THROTTLE · A/D PITCH · X CUTOFF · 1–5 CAMERA</div>
          </>}
          {tab==='systems'&&<>
            <div className="fo-section-title">PROPULSION / ELECTRICAL <span>SYS-02</span></div>
            <div className="fo-meter"><div><span>MAIN PROPELLANT</span><b>{fmt(fuelPct,0)}%</b></div><div className="fo-track"><i style={{width:`${fuelPct}%`,background:fuelPct<20?'#e7ae60':'#64c9e9'}}/></div><small>{fmt(telemetry.fuel)} / {fmt(maxFuel)} units</small></div>
            <div className="fo-meter"><div><span>BATTERY CHARGE</span><b>{fmt(powerPct,0)}%</b></div><div className="fo-track"><i style={{width:`${powerPct}%`,background:powerPct<20?'#e7ae60':'#68d8a6'}}/></div><small>{fmt(telemetry.battery)} / {fmt(maxBattery)} units</small></div>
            <div className="fo-system-line"><span>MAIN ENGINE</span><b>{telemetry.engine?'● FIRING':'○ OFFLINE'}</b></div><div className="fo-system-line"><span>ENGINE THRUST</span><b>{fmt(telemetry.engine?(Number(stats.thrust)||0)*telemetry.throttle/100:0)} kN</b></div><div className="fo-system-line"><span>SOLAR ARRAYS</span><b>{hasSolar?(telemetry.solar?'DEPLOYED':'STOWED'):'NOT INSTALLED'}</b></div>
            <button className="fo-wide" disabled={phase!=='flight'||!hasSolar} onClick={()=>command('solar')}>{telemetry.solar?'RETRACT SOLAR ARRAYS':'DEPLOY SOLAR ARRAYS'}</button>
            <p className="fo-note">Electrical load and solar charging are simplified. Solar charging is a training approximation and does not yet simulate sunlight or eclipse.</p>
            <div className="fo-section-title">INSTALLED HARDWARE</div><div className="fo-hardware">{build.length?build.map((id,i)=><span key={`${id}-${i}`}>{id}</span>):'No build data'}</div>
          </>}
          {onMarsTransfer && <div className="fo-orbit-assist"><b>MARS EXPEDITION / EARTH DEPARTURE</b><p>Reach a stable Earth orbit using the flight controls. The optional circular-orbit training assist is available above 100 km with the engine off. Your rover and landing package are carried inside the rocket aeroshell. Your configured stack continues toward Mars using the transfer tanks you installed. The rover entry capsule separates visibly at Mars approach.</p><button disabled={!telemetry.orbit || telemetry.engine} onClick={()=>{endAudio();onMarsTransfer();}}>CONTINUE TO MARS TRANSFER</button><small>{telemetry.orbit?'ORBIT READY · CUT ENGINE, THEN DEPART':'REACH STABLE EARTH ORBIT FIRST'}</small></div>}
          {tab==='tasks'&&onMarsTransfer&&<div className="fo-note">MARS FLIGHT PLAN: Earth parking orbit, transfer burn, course correction, atmospheric entry, parachute, powered landing, rover science and Earth downlink. Use the departure command above once orbit is stable.</div>}
          {tab==='tasks'&&!onMarsTransfer&&<>
            <div className="fo-section-title">MISSION PROCEDURES <span>OPS-03</span></div><p className="fo-note">Reach 100 km to unlock camera 4: FULL EARTH. Look at the entire planet first, then activate and capture. The full-disk view is a cinematic remote camera; 100 km is too low to see the whole planet naturally. Orbit remains a separate challenge.</p>
            <div className="fo-task-list">{missionTasks.map((task,i)=><div key={task.name} className={task.done?'done':''}><span>{task.done?'✓':String(i+1).padStart(2,'0')}</span>{task.name}</div>)}</div>
            <div className="fo-section-title">PAYLOAD COMMANDS</div><p className="fo-note">FIRST: Reach 100 km → click <b>4 FULL EARTH</b> → see the planet → activate camera → capture. Gallery saves after the screenshot succeeds.</p>
            <div className="fo-task-buttons"><button disabled={phase!=='flight'||cameraMode!=='earth'||!hasCamera||telemetry.payload} onClick={()=>command('payload')}>ACTIVATE CAMERA</button><button disabled={phase!=='flight'||cameraMode!=='earth'||!telemetry.payload||photos.length>=5||captureRequest.current} onClick={()=>command('capture')}>{photos.length>=5?'GALLERY FULL (5/5)':`CAPTURE OBSERVATION (${photos.length}/5)`}</button><button disabled={phase!=='flight'||!telemetry.data||telemetry.transmitted} onClick={()=>command('transmit')}>TRANSMIT DATA</button></div>
            {telemetry.transmitted&&<div className="fo-success">✓ SCIENCE DATA RECEIVED — RETURN TO EARTH FOR FULL SUCCESS</div>}
            <div className="fo-section-title">EARTH OBSERVATION GALLERY <span>{photos.length} / 5 SAVED</span></div>
            <p className="fo-note">Rotate Earth left or right before each capture. Take up to five snapshots. Snapshots show the simulated Earth from the FULL EARTH view (cinematic remote camera, not a real satellite photograph). They remain available until you reset or leave this launch.</p>
            <div className="fo-photo-gallery">{photos.map((photo,i)=><div className="fo-photo" key={photo.id}><img src={photo.url} alt={`Earth observation ${i+1}`}/><small>OBS {photos.length-i} · {fmt(photo.altitude/1000,1)} km</small><a href={photo.url} download={`Earth-Observation-${i+1}.png`}>SAVE PNG</a></div>)}</div>
            <div className="fo-section-title">RECOVERY / RETURN</div><div className="fo-system-line"><span>REENTRY STATUS</span><b>{telemetry.reentry?'ATMOSPHERIC ENTRY':telemetry.deorbitStarted?'DEORBIT COMPLETE':telemetry.orbit?'IN ORBIT':'SUBORBITAL'}</b></div><div className="fo-system-line"><span>ENTRY STRESS (TRAINING)</span><b>{fmt(telemetry.heat,0)}%</b></div><button className="fo-wide" disabled={phase!=='flight'||!telemetry.orbit||telemetry.fuel<5} onClick={()=>command('deorbit')}>RETROGRADE DEORBIT BURN · 150 m/s</button><button className="fo-wide" disabled={phase!=='flight'||!telemetry.orbit||telemetry.deorbitStarted} onClick={()=>command('deorbitDemo')}>TRAINING DEORBIT ASSIST (NO FUEL)</button>
            <p className="fo-note">Deorbit is a planned descent, so the generic uncontrolled-descent warning is suppressed. During return the spacecraft automatically points its heat-shield end into its velocity direction (simplified 2D animation). In orbit, use RETROGRADE DEORBIT BURN, then time warp while coasting. Arm your parachute before or during descent. It opens automatically at or below 5 km when total speed is at or below 350 m/s. Time warp automatically returns to 1× below 10 km until the parachute opens. After deployment, you can speed up the safe parachute descent to 20×. Suborbital flights can also coast back naturally. Reentry heating and recovery remain simplified.</p>
            <div className="fo-system-line"><span>RECOVERY SPEED</span><b>{fmt(Math.hypot(telemetry.vertical,telemetry.horizontal),0)} m/s · LIMIT 350</b></div>
            <p className="fo-note" role="status">{!hasParachute?'Recovery Parachute is missing. Install it in the VAB before launch.':telemetry.parachute?'Parachute open — landing descent stabilized.':telemetry.parachuteArmed?(telemetry.vertical>=0?'ARMED — waiting for descent.':telemetry.altitude>5000?'ARMED — waiting to reach 5 km.':Math.hypot(telemetry.vertical,telemetry.horizontal)>350?'ARMED — waiting for atmospheric braking to 350 m/s.':'ARMED — deploying automatically.'):'Click ARM RECOVERY PARACHUTE now. It will wait for safe deployment conditions.'}</p>
            <button className="fo-wide" disabled={phase!=='flight'||!hasParachute||telemetry.parachute||telemetry.parachuteArmed} onClick={()=>command('parachute')}>{telemetry.parachute?'PARACHUTE DEPLOYED':telemetry.parachuteArmed?'PARACHUTE ARMED · AUTO DEPLOY':hasParachute?'ARM RECOVERY PARACHUTE':'PARACHUTE NOT INSTALLED'}</button>
            {telemetry.parachute&&phase==='flight'&&<button className="fo-wide" onClick={()=>{flightRef.current.warp=warp===20?1:20;setWarp(warp===20?1:20);}}>{warp===20?'WATCH RECOVERY AT 1×':'SPEED UP SAFE PARACHUTE DESCENT · 20×'}</button>}
          </>}
          <div className="fo-section-title">MISSION CONTROL / CAPCOM <span>LIVE LOG</span></div>
          <div className="fo-log">{messages.slice(0,4).map((m,i)=><div key={`${m.t}-${i}`}><small>{m.t}</small><span>{m.text}</span></div>)}</div>
        </div>
        {warning&&<div className={`fo-alert ${warning.severity}`}><div className="fo-alert-title">⚠ {warning.title}</div><p>{warning.detail}</p>{guidance&&<div className="fo-guidance"><b>FLIGHT DIRECTOR / PROCEDURE</b><span>{warning.hint}</span></div>}<button onClick={()=>speak(`Mission control. ${warning.title.toLowerCase()}. ${warning.hint}`)}>REPLAY SPOKEN HINT</button><button onClick={()=>setGuidance(v=>!v)}>{guidance?'HIDE PROCEDURE':'SHOW RECOMMENDED ACTION'}</button></div>}
        <div className="fo-footer-actions">
          {phase==='ready'&&onMarsResume&&<button className="fo-secondary" onClick={()=>{endAudio();onMarsResume();}}>RESUME SAVED MARS FLIGHT · SAME BLUEPRINT</button>}
          {phase==='ready'&&<button className="fo-primary" disabled={!allReady} onClick={begin}>{allReady?'INITIATE LAUNCH SEQUENCE':'COMPLETE VEHICLE CHECKS'}</button>}
          {phase==='countdown'&&<button className="fo-stop" onClick={reset}>■ ABORT COUNTDOWN</button>}
          {(phase==='flight'||phase==='landed'||phase==='failed'||phase==='success')&&<button className="fo-secondary" onClick={reset}>↻ RESET SIMULATION</button>}
        </div>
      </aside>
    </div>
  </div>;
}
