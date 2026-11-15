/** Cooperative mission-control consoles. AI assistance: AI_USAGE.md. */
import { useEffect, useRef, useState } from 'react';
import { crewBridge } from './missionIntegration.js';
import { saveRecord } from './missionRecords.js';
import './CrewPlay.css';
const roles={flight:'Flight controller',engineer:'Engineer',scientist:'Scientist'};
async function api(action,body) {
  const response=await fetch(`/api/crew/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let data;try{data=await response.json();}catch{throw new Error('Room server unavailable. Use npm run dev:crew or the included Node server.');}
  if(!response.ok)throw new Error(data.error||'Room request failed.');return data;
}
function CrewRange({action,label,value,min,max,send}) {
  const [draft,setDraft]=useState(value||0);
  const editing=useRef(false);
  useEffect(()=>{if(!editing.current)setDraft(value||0);},[value]);
  const commit=e=>{editing.current=false;send(action,Number(e.currentTarget.value));};
  return <label>{label} {Math.round(draft)}<input aria-label={`Crew ${label}`} type="range" min={min} max={max} value={draft} onFocus={()=>{editing.current=true;}} onChange={e=>setDraft(Number(e.target.value))} onPointerUp={commit} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))commit(e);}} onBlur={()=>{editing.current=false;}}/></label>;
}
function CrewControls({s,role,send}) {
  const button=(action,label,value)=> <button key={`${action}-${value}`} onClick={()=>send(action,value)}>{label}</button>;
  const slider=(action,label,value,min,max)=> <CrewRange key={action+s.attemptId} action={action} label={label} value={value} min={min} max={max} send={send}/>;
  const earth=['earth','mars-launch'].includes(s.mission),lunar=s.mission==='lunar';
  if(['success','failed'].includes(s.phase))return <p>Flight complete. The commander can return to assembly for another mission.</p>;
  if(role==='flight')return <>
    {earth&&s.phase==='flight'&&<>{slider('throttle','Throttle',s.throttle,0,100)}{slider('pitch','Pitch',s.pitch,-10,100)}{button('cut','ENGINE CUTOFF')}{button('ignite','ENGINE START')}</>}
    {lunar&&<>{s.phase==='briefing'&&button('park','START EARTH LAUNCH')}{s.phase==='parking'&&button('transfer','START MOON TRANSFER')}{s.phase==='arrival'&&button('captureOrbit','ENTER LUNAR ORBIT')}{s.phase==='orbit'&&button('descend','SEPARATE LANDER')}{s.phase==='descent'&&<>{slider('throttle','Throttle',s.throttle,0,100)}{slider('pitch','Tilt',s.pitch,-30,30)}{button('cut','ENGINE CUTOFF')}{button('ignite','ENGINE START')}</>}</>}
    {s.mission==='mars'&&<>{s.phase==='transfer'&&button('burn','START TRANSFER BURN')}{['cruise','arrival'].includes(s.phase)&&<>{button('correct','− CORRECTION',-1)}{button('correct','+ CORRECTION',1)}</>}{s.phase==='arrival'&&button('entry','COMMIT ENTRY')}{s.phase==='entry'&&button('chute','DEPLOY PARACHUTE')}{s.phase==='parachute'&&button('powered','IGNITE LANDING THRUSTERS')}{s.phase==='descent'&&<>{slider('throttle','Throttle',s.throttle,0,100)}{slider('bank','Tilt',s.pitch,-30,30)}</>}</>}
    <p>Commander handles scene navigation, cameras, rover driving and training assists. Commands still obey the mission's safety gates.</p>
  </>;
  if(role==='engineer')return <>{s.mission==='mars'?<>{button('deploy','DEPLOY ROVER')}{button('antenna','TOGGLE ANTENNA')}{button('guidance','LANDING GUIDANCE ON',true)}{button('guidance','MANUAL LANDING',false)}</>:<>{button('solar','TOGGLE SOLAR ARRAY')}{lunar? <>{button('legs','EXTEND LEGS')}{button('deployRover','DEPLOY ROVER')}{button('guidance','LANDING GUIDANCE ON',true)}{button('guidance','MANUAL LANDING',false)}</>:button('parachute','ARM RECOVERY PARACHUTE')}</>}<p>Watch fuel and battery. Guidance and deployment commands unlock at their normal mission stages.</p></>;
  return <>{earth?<>{button('payload','ACTIVATE IMAGING PAYLOAD')}{button('capture','CAPTURE EARTH PHOTO')}{button('transmit','TRANSMIT SCIENCE')}</>:<>{button('photo','TAKE SURFACE PHOTO')}{s.mission==='mars'?<>{button('scan','SCAN OUTCROP')}{button('sample','COLLECT BASALT')}</>:<>{button('collectBasalt','COLLECT BASALT')}{button('collectRegolith','COLLECT LUNAR SOIL')}{button('deploySensor','DEPLOY SEISMOMETER')}{button('survey','RECORD SEISMIC SURVEY')}</>}{button('transmit','TRANSMIT SCIENCE')}</>}<p>The commander must position the vehicle beside each target. Photos come from the commander's live scene.</p></>;
}
export default function CrewPlay({session,onSession,onStart,compact=false}) {
  const [name,setName]=useState(''),[code,setCode]=useState(''),[role,setRole]=useState('flight');
  const [room,setRoom]=useState(null),[status,setStatus]=useState(''),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false);
  const snapshot=useRef(null),inFlight=useRef(false);
  useEffect(()=>{
    if(!session)return;
    const stream=new EventSource(`/api/crew/events?code=${session.code}&token=${session.token}`);
    stream.onopen=()=>{setConnected(true);setStatus('');};
    stream.onerror=()=>{setConnected(false);setStatus('Connection interrupted. Reconnecting…');};
    stream.addEventListener('state',e=>{const state=JSON.parse(e.data);setRoom(state);if(state.snapshot?.record)saveRecord(state.snapshot.record);});
    stream.addEventListener('command',e=>{const command=JSON.parse(e.data);crewBridge.command(command.action,command.value);setStatus(`${command.from}: ${command.action} command received.`);});
    stream.addEventListener('closed',()=>{stream.close();setConnected(false);setStatus('The commander closed the room.');onSession(null);});
    const unsubscribe=session.role==='commander'?crewBridge.subscribe(s=>{snapshot.current=s;}):()=>{};
    let last='';
    const timer=session.role==='commander'?setInterval(async()=>{
      const value=JSON.stringify(snapshot.current);if(inFlight.current||value===last)return;
      inFlight.current=true;
      try{await api('publish',{...session,snapshot:snapshot.current});last=value;}catch(error){setStatus(error.message);}finally{inFlight.current=false;}
    },600):null;
    return()=>{stream.close();unsubscribe();clearInterval(timer);};
  },[session,onSession]);
  const enter=async(action)=>{setBusy(true);setStatus('');try{onSession(await api(action,{name:name.trim()||'Crew',code:code.trim().toUpperCase(),role}));}catch(e){setStatus(e.message);}finally{setBusy(false);}};
  const leave=async()=>{try{await api('leave',session);}catch{/* Local exit remains possible if the server has stopped. */}onSession(null);};
  const send=async(action,value)=>{try{await api('command',{...session,action,value});setStatus('Command sent. Check the mission message for the result.');}catch(e){setStatus(e.message);}};
  if(!session)return <section className="crew-lobby"><div className="eyebrow">COOPERATIVE MISSION CONTROL / 2–4 PLAYERS</div><h2>MULTIPLAYER</h2><p className="intro">One shared mission. The commander flies the 3D spacecraft while the crew operates live remote consoles.</p>
    <label>YOUR NAME<input aria-label="Crew name" maxLength={30} value={name} onChange={e=>setName(e.target.value)}/></label>
    <button className="action" disabled={busy||!name.trim()} onClick={()=>enter('create')}>CREATE ROOM AS COMMANDER</button>
    <div className="info-card"><label>ROOM CODE<input aria-label="Room code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label><label>CREW ROLE<select aria-label="Crew role" value={role} onChange={e=>setRole(e.target.value)}>{Object.entries(roles).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button className="action" disabled={busy||!name.trim()||code.length!==6} onClick={()=>enter('join')}>JOIN ROOM</button></div>
    <p className="small-note">Everyone must open this same game server address. Different networks need a publicly hosted Node server. A static website alone cannot host rooms.</p>{status&&<p role="status">{status}</p>}
  </section>;
  const s=room?.snapshot;
  const content=<><b>ROOM {session.code} / {session.role==='commander'?'COMMANDER':roles[session.role].toUpperCase()}</b><p>{connected?'CONNECTED':'RECONNECTING'} · {room?.crew.length||1}/4 crew</p><ul>{room?.crew.map(member=><li key={member.role}>{member.name} / {member.role} {member.online?'●':'(offline)'}</li>)}</ul>
    {!compact&&<p className="small-note">Server: {location.origin}<br/>Share this address and room code. On the same Wi-Fi, replace localhost with the host laptop's network address.</p>}
    {session.role==='commander'?<>{!compact&&<button className="action" disabled={!connected} onClick={onStart}>ENTER MISSION HEADQUARTERS</button>}<p>The crew shares your live mission. You retain all local controls.</p></>:s?<><h3>{s.mission.toUpperCase()} / {s.phase.toUpperCase()}</h3><dl><dt>ALTITUDE</dt><dd>{(s.altitude/1000).toFixed(2)} km</dd><dt>VERTICAL SPEED</dt><dd>{s.vertical.toFixed(1)} m/s</dd><dt>FUEL</dt><dd>{Math.round(s.fuel)}</dd><dt>BATTERY</dt><dd>{Math.round(s.battery)}</dd><dt>PHOTOS</dt><dd>{s.photos}</dd></dl><p role="status">{s.message}</p>{s.rover&&<p>Rover {s.rover.x.toFixed(1)}, {s.rover.z.toFixed(1)} m</p>}<CrewControls s={s} role={session.role} send={send}/></>:<p>Waiting for the commander to select and launch a mission.</p>}
    {status&&<p role="status">{status}</p>}<button className="action" onClick={leave}>{session.role==='commander'?'CLOSE ROOM':'LEAVE ROOM'}</button></>;
  return compact?<details className="crew-overlay"><summary>CREW ROOM {session.code} · {room?.crew.length||1}/4</summary><div>{content}</div></details>:<section className="crew-lobby">{content}</section>;
}
