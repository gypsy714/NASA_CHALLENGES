import { useMissionIntegration } from './missionIntegration.js';
/** AI-assisted implementation by Codex. See AI_USAGE.md for scope and sources. */
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import LaunchPreparation from './LaunchPreparation';
import MarsWorld from './MarsWorld';
import { createMarsMission, commandMars, stepMars, scienceSites, rocks, canDeployChute, communicationReady } from './marsPhysics.js';
import './MarsMission.css';
import { createMarsAudio } from './marsAudio.js';

const titles = {
  transfer: 'EARTH DEPARTURE', cruise: 'INTERPLANETARY CRUISE', arrival: 'MARS APPROACH',
  separation: 'CRUISE STAGE SEPARATION', entry: 'ROVER CAPSULE / MARS ENTRY', parachute: 'PARACHUTE DESCENT', descent: 'POWERED LANDING',
  landed: 'SURFACE EXPLORATION', transmitting: 'EARTH DOWNLINK', success: 'MISSION SUCCESS', failed: 'MISSION FAILED',
};
const num = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
const SAVE_KEY = 'beyond-earth-mars-checkpoint-v2';
function savedMission(blueprintId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY));
    return saved?.version === 2 && saved.blueprintId===blueprintId && saved.state?.rover && titles[saved.state.phase] ? saved.state : null;
  } catch { return null; }
}
export default function MarsMission({ mission, name, build, stats, checks, rocket, onBack, initialMission,configuration,rocketHeight }) {
  const { active: loading, progress: loadProgress } = useProgress();
  const loadingRef = useRef(false); loadingRef.current = loading;
  const blueprintId=JSON.stringify({build,configuration});
  const [resume,setResume]=useState(()=>savedMission(blueprintId));
  const [launched, setLaunched] = useState(() => !!initialMission);
  const flight = useRef(null);
  if (!flight.current) flight.current = initialMission || createMarsMission(configuration);
  const [s, setState] = useState(() => ({ ...flight.current }));
  const keys = useRef(new Set()), pad = useRef({}), capture = useRef(false), sound = useRef(null);
  const [help, setHelp] = useState(true), [voice, setVoice] = useState(false);
  const update = () => setState({ ...flight.current, rover: { ...flight.current.rover } });
  const act = (action, value) => {
    if (!sound.current) sound.current = createMarsAudio();
    const accepted = commandMars(flight.current, action, value);
    sound.current.cue(accepted ? action === 'photo' ? 1100 : 740 : 330, .1);
    update();
  };
  const photograph = () => { if (flight.current.deployment >= 1) capture.current = true; };
  const interact = () => {
    const f = flight.current;
    const nearest = scienceSites.find(site => !f[site.id] && Math.hypot(f.rover.x - site.x, f.rover.z - site.z) <= 3.6);
    act(nearest?.id || 'scan');
  };
  useEffect(() => {
    if (!launched || initialMission) return;
    const timer = setInterval(() => {
      try { sessionStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, blueprintId,state: flight.current })); }
      catch { /* A full browser storage area must never interrupt gameplay. */ }
    }, 2000);
    return () => clearInterval(timer);
  }, [launched, initialMission,blueprintId]);
  useEffect(() => {
    useMissionIntegration('mars',name,s,(action,value)=>{
    const f=flight.current;
    if(action==='photo')photograph();
    else if(action==='guidance'&&f.phase==='descent'){f.guidance=!!value;update();}
    else if(action==='throttle'&&f.phase==='descent'&&!f.guidance){f.throttle=Math.max(0,Math.min(100,value));update();}
    else if(action==='bank'&&f.phase==='descent'&&!f.guidance){f.bank=Math.max(-30,Math.min(30,value));update();}
    else act(action,value);
  },{enabled:launched});
  if (!launched) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), elapsed = Math.min(.15, (now - last) / 1000); last = now;
      if (loadingRef.current) return;
      const f = flight.current, k = keys.current;
      const input = {
        forward: (k.has('w') || k.has('arrowup') || pad.current.forward ? 1 : 0) - (k.has('s') || k.has('arrowdown') || pad.current.back ? 1 : 0),
        steer: (k.has('d') || k.has('arrowright') || pad.current.right ? 1 : 0) - (k.has('a') || k.has('arrowleft') || pad.current.left ? 1 : 0),
        brake: k.has(' ') || pad.current.brake,
      };
      let remaining = elapsed * (['entry', 'parachute', 'descent'].includes(f.phase) ? f.warp : 1);
      while (remaining > 0) { const dt = Math.min(.025, remaining); stepMars(f, dt, input); remaining -= dt; }
      sound.current?.engine(f.phase === 'descent' && f.fuel > 0 ? f.throttle : 0);
      update();
    }, 40);
    return () => clearInterval(timer);
  }, [launched]);
  useEffect(() => () => { sound.current?.close(); }, []);
  useEffect(() => {
    const stop = () => { keys.current.clear(); pad.current = {}; };
    const down = e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) { e.preventDefault(); keys.current.add(key); }
      if (!e.repeat && key === 'e') interact();
      if (!e.repeat && key === 'c') { flight.current.camera = (flight.current.camera + 1) % 2; update(); }
    };
    const up = e => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', stop); window.addEventListener('pointerup', stop);
    return () => { stop(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', stop); window.removeEventListener('pointerup', stop); };
  }, []);
  useEffect(() => {
    if (!voice || !launched || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cue = new SpeechSynthesisUtterance(s.message); cue.rate = 1.1; cue.volume = .8;
    window.speechSynthesis.speak(cue);
    return () => window.speechSynthesis.cancel();
  }, [s.message, voice, launched]);
  if (!launched) return <LaunchPreparation mission={mission} name={name} build={build} stats={stats} checks={checks} rocket={rocket} onBack={onBack}
    onMarsTransfer={() => { flight.current=createMarsMission(configuration);setLaunched(true); update(); }}
    onMarsResume={resume?()=>{flight.current=resume;setLaunched(true);update();}:null} />;
  const surface = ['landed', 'transmitting', 'success'].includes(s.phase);
  const change = (key, value) => { flight.current[key] = value; update(); };
  const driveButton = (key, label) => <button onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pad.current[key] = true; }} onPointerUp={() => { pad.current[key] = false; }} onPointerCancel={() => { pad.current[key] = false; }}>{label}</button>;
  return <div className="mars-mission">
    <header><b>BEYOND EARTH <span>/ MARS EXPEDITION</span></b><div><button onClick={() => { sessionStorage.removeItem(SAVE_KEY);setResume(null); flight.current = createMarsMission(configuration); setLaunched(false); update(); }}>NEW EARTH LAUNCH</button> <button onClick={onBack}>← ASSEMBLY</button></div></header>
    <main>
      <section className="mars-view">
        <Canvas shadows camera={{ position: [0, 15, 47], fov: 48, near: .1, far: 1500 }} gl={{ antialias: true, preserveDrawingBuffer: true }} dpr={[1, 1.5]}>
          <Suspense fallback={null}><MarsWorld flight={flight} snapshot={s} rocket={rocket} rocketHeight={rocketHeight} capture={capture} onPhoto={url => { if (url) act('photo', url); else { flight.current.message = 'Photo could not be saved. Please retry.'; update(); } }} /></Suspense>
        </Canvas>
        {loading && <div className="mars-loading">Loading local spacecraft and surface materials… {num(loadProgress)}%</div>}
        <div className="mars-stage"><small>MISSION 003 / {name}</small><h1>{titles[s.phase]}</h1><p>{surface ? 'Drive, investigate, and send your discoveries to Earth.' : 'Earth launch → transfer → entry → powered landing → science'}</p></div>
        {!surface && !['transfer', 'cruise', 'arrival'].includes(s.phase) && <div className="mars-entry-meter"><span>ENTRY HEATING</span><meter min="0" max="100" value={s.heat} /><b>{num(s.heat)}%</b></div>}
        {s.phase === 'failed' && <div className="mars-result"><h2>VEHICLE LOST</h2><p>{s.failure}</p><button onClick={() => { flight.current = createMarsMission(configuration); update(); }}>RETRY FROM PARKING ORBIT</button></div>}
        {s.phase === 'success' && <div className="mars-result"><h2>MISSION SUCCESS</h2><p>Landscape photo, rock spectrum and sample analysis received on Earth.</p><button onClick={onBack}>RETURN TO ASSEMBLY</button></div>}
        <footer>{surface ? `ROVER ${num(s.rover.x, 1)}, ${num(s.rover.z, 1)} m · SPEED ${num(s.rover.speed, 2)} m/s` : ['transfer','cruise','arrival'].includes(s.phase) ? `EARTH–MARS TRANSFER · DAY ${num(s.days)} / 210 · DIAGRAM NOT TO SCALE` : `ALT ${num(s.altitude / 1000, 2)} km · VERTICAL ${num(s.vertical, 1)} m/s · LATERAL ${num(s.horizontal, 1)} m/s`}<span>Drag mouse to orbit · Scroll to zoom<br />AI-assisted simulation visuals</span></footer>
      </section>
      <aside>
        <div className="mars-console-title">MISSION CONTROL <button onClick={() => setVoice(!voice)}>VOICE {voice ? 'ON' : 'OFF'}</button></div>
        <div className="mars-readouts"><div><small>LANDING PROPELLANT</small><b>{num(s.fuel)} kg</b></div><div><small>TRANSFER RESERVE</small><b>{num(s.serviceFuel)} kg</b></div><div><small>ROVER BATTERY</small><b>{num(s.rover.battery/(s.rover.capacity||100)*100)}%</b></div><div><small>CRUISE</small><b>{num(s.days)} / 210 days</b></div></div>
        <div className="mars-advice" role="status"><small>NEXT ACTION / CAPCOM</small><p>{s.message}</p></div>
        {['transfer','cruise','arrival'].includes(s.phase) && <div className="mars-row"><button onClick={()=>change('routeView',false)}>SPACECRAFT CAMERA</button><button onClick={()=>change('routeView',true)}>TRAJECTORY MAP</button></div>}
        {s.phase === 'transfer' && <><p>This is your configured launch stack carrying your lander and rover. The rover capsule separates from this vehicle at Mars approach; it is not a replacement spacecraft.</p><button className="mars-primary" disabled={s.burn > 0} onClick={() => act('burn')}>{s.burn ? `INJECTION BURN ${num(Math.min(1, s.burn) * 100)}%` : 'START MARS TRANSFER BURN'}</button></>}
        {['cruise', 'arrival'].includes(s.phase) && <>
          <h3>TRAJECTORY CORRECTION</h3><p>Arrival offset <b>{num(s.error, 1)} km</b>. Target: −4 to +4 km. Each pulse changes the corridor by 2 km and consumes 2 kg.</p>
          <div className="mars-row"><button onClick={() => act('correct', -1)}>− CORRECTION BURN</button><button onClick={() => act('correct', 1)}>+ CORRECTION BURN</button></div>
          {s.phase === 'cruise' && <><label>TIME WARP<select value={s.warp} onChange={e => change('warp', Number(e.target.value))}><option value={1}>1 day / second</option><option value={5}>5 days / second</option><option value={20}>20 days / second</option></select></label><progress max="210" value={s.days} /></>}
          {s.phase === 'arrival' && <button className="mars-primary" disabled={Math.abs(s.error) > 4 || !s.correction} onClick={() => act('entry')}>COMMIT TO MARS ENTRY</button>}
          <p className="mars-note">Trajectory and transfer duration are teaching abstractions, not a solved real launch window.</p>
        </>}
        {['entry', 'parachute', 'descent'].includes(s.phase) && <>
          <label>SIMULATION SPEED<select value={s.warp} onChange={e => change('warp', Number(e.target.value))}><option value={1}>1×</option><option value={4}>4×</option><option value={8}>8×</option></select></label>
          {s.phase === 'entry' && <><p>Heat shield slows entry. Deploy only at 3–13 km and below 550 m/s.</p><button className="mars-primary" disabled={!canDeployChute(s)} onClick={() => act('chute')}>{canDeployChute(s) ? 'DEPLOY SUPERSONIC PARACHUTE NOW' : 'PARACHUTE · WAIT FOR SAFE WINDOW'}</button><label>ENTRY BANK {s.bank}°<input type="range" min="-60" max="60" value={s.bank} onChange={e => change('bank', Number(e.target.value))} /></label></>}
          {s.phase === 'parachute' && <><p>Parachutes slow the vehicle, but cannot give a safe touchdown in this thin atmosphere.</p><button className="mars-primary" disabled={s.altitude > 2500} onClick={() => act('powered')}>RELEASE CHUTE + IGNITE LANDING THRUSTERS</button></>}
          {s.phase === 'descent' && <><label><input type="checkbox" checked={s.guidance} onChange={e => change('guidance', e.target.checked)} /> LANDING GUIDANCE</label><label>THROTTLE {num(s.throttle)}%<input aria-label="Landing throttle" type="range" min="0" max="100" disabled={s.guidance} value={s.throttle} onChange={e => change('throttle', Number(e.target.value))} /></label><label>TILT {s.bank}°<input type="range" min="-30" max="30" disabled={s.guidance} value={s.bank} onChange={e => change('bank', Number(e.target.value))} /></label><p>Safe touchdown: vertical ≤3 m/s, lateral ≤2 m/s. Gravity continues when the engine is off.</p></>}
        </>}
        {surface && <>
          {!s.deployed && <button className="mars-primary" onClick={() => act('deploy')}>UNFOLD & DEPLOY ROVER</button>}
          {s.deployed && <>
            <div className="mars-map" aria-label="Rover navigation map">
              <svg viewBox="-30 -30 60 60" role="img" aria-label="North is up. Gold targets are outcrop and sample. Blue circle is relay. White arrow is rover.">
                <rect x="-30" y="-30" width="60" height="60" fill="#18262a" />
                {rocks.filter(r => Math.abs(r.x) < 30 && Math.abs(r.z) < 30).map((r, i) => <circle key={i} cx={r.x} cy={r.z} r={r.radius} fill="#6e6655" />)}
                <circle cx="0" cy="12" r="5" fill="none" stroke="#69a9b9" strokeWidth=".25" />
                <text x="1" y="13" fontSize="2.4" fill="#87c8d4">RELAY</text>
                {scienceSites.map(site => <g key={site.id}><circle cx={site.x} cy={site.z} r="1" fill={s[site.id] ? '#82bc9c' : '#e2c18a'} /><text x={site.x + 2} y={site.z} fontSize="2.4" fill="#e2c18a">{site.id.toUpperCase()}</text></g>)}
                <path d="M0 -1.7 L-1.2 1.3 L0 .6 L1.2 1.3 Z" fill="#f6efdb" transform={`translate(${s.rover.x} ${s.rover.z}) rotate(${s.rover.heading * 180 / Math.PI})`} />
                <text x="-27" y="-25" fontSize="3" fill="#b5c6c9">N ↑</text>
              </svg>
              <small>60 m LOCAL MAP · WHITE = ROVER · GOLD = SCIENCE</small>
            </div>
            <h3>ROVER CONTROLS <button onClick={() => setHelp(!help)}>{help ? 'HIDE HINTS' : 'SHOW HINTS'}</button></h3>
            {help && <p className="mars-note">W / ↑ forward · S / ↓ reverse<br />A / ← steer left · D / → steer right<br />Space brake · E interact · C camera<br />Drag mouse to rotate the view. Buttons below work too.</p>}
            <div className="mars-drive">{driveButton('forward', '↑ FORWARD')}<div>{driveButton('left', '← LEFT')}{driveButton('brake', '■ BRAKE')}{driveButton('right', 'RIGHT →')}</div>{driveButton('back', '↓ REVERSE')}</div>
            <button onClick={() => change('camera', (s.camera + 1) % 2)}>C · {s.camera ? 'OVERHEAD CAMERA' : 'THIRD-PERSON CAMERA'}</button>
            <h3>SCIENCE OBJECTIVES</h3>
            <button disabled={s.deployment < 1} onClick={photograph}>{s.photo ? '✓ RETAKE LANDSCAPE PHOTO' : '1 · PHOTOGRAPH LANDSCAPE'}</button>
            {s.photo && <a className="mars-photo" href={s.photo} download="Mars-landscape.png"><img src={s.photo} alt="Saved simulated Martian landscape" />SAVE PHOTO PNG</a>}
            {scienceSites.map(site => <div className="mars-target" key={site.id}><b>{s[site.id] ? '✓ ' : ''}{site.name}</b><p>{site.description} {num(Math.hypot(s.rover.x - site.x, s.rover.z - site.z), 1)} m away</p><button disabled={s[site.id] || !!s.task || s.deployment < 1} onClick={() => act(site.id)}>{s.task === site.id ? `${num(s.taskTime / 5 * 100)}%` : site.id === 'scan' ? '2 · SCAN ROCK' : '3 · COLLECT WITH ARM'}</button></div>)}
            <p className="mars-note">Gold labels identify real, visible targets. Drive beside them and brake. Task buttons never drive for you.</p>
            <h3>RETURN SCIENCE TO EARTH</h3><p>Drive to RELAY (0, 12 m), stop, and deploy the antenna. Link: {communicationReady(s) ? 'CLEAR' : 'REPOSITION / STOP'}.</p>
            <button onClick={() => act('antenna')}>{s.antenna ? '✓ ANTENNA DEPLOYED · STOW' : 'DEPLOY HIGH-GAIN ANTENNA'}</button>
            <button className="mars-primary" disabled={!s.photo || !s.scan || !s.sample || !s.antenna || !communicationReady(s) || s.phase !== 'landed'} onClick={() => act('transmit')}>TRANSMIT ALL SCIENCE</button>
            {s.phase === 'transmitting' && <progress value={s.transmission} max="1" />}
            <p className="mars-note">Direct driving is a gameplay simulation. Real Mars rovers use autonomous navigation and commands delayed by interplanetary light travel. Park to recharge using the installed onboard power unit.</p>
          </>}
        </>}
        <details><summary>Simulation & credits</summary><p>Rover model: NASA/JPL, Mars 2020 Perseverance. Mars globe texture: NASA/JPL-Caltech, Viking imagery processed at USGS. Surface materials: Poly Haven, CC0, recolored for a fictional Mars scene. AI-assisted code and procedural terrain. This is an educational simulation with simplified dynamics and controls, not a NASA mission simulator. Existing game soundtrack retained.</p><a href="https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/" target="_blank" rel="noreferrer">NASA/JPL rover model</a><br/><a href="https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/" target="_blank" rel="noreferrer">NASA/JPL entry and landing reference</a></details>
      </aside>
    </main>
  </div>;
}
