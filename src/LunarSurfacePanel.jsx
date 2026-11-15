import {SURFACE_TARGETS,distanceTo} from './lunarSurface.js';

export function nextSurfaceAction(s){
 if(!s.rover.deployed)return {label:'DEPLOY SURFACE ROVER',action:'deployRover',hint:'A small robotic rover carries the sampler, camera, and seismic instrument.'};
 for(const [key,action] of [['basalt','collectBasalt'],['regolith','collectRegolith'],['sensor','deploySensor']]){
  const done=key==='sensor'?s.instrument:s.samples[key];if(done)continue;
  const label=key==='sensor'?'DEPLOY SEISMOMETER':`COLLECT ${key==='basalt'?'BASALT ROCK':'LUNAR SOIL'}`;
  return {label,action,outOfRange:distanceTo(s,key)>1.8,hint:distanceTo(s,key)>1.8?`Drive manually to ${SURFACE_TARGETS[key].label} with the arrow keys or direction buttons. Get within 1.8 m to ${key==='sensor'?'deploy the sensor':'collect the sample'}. Collection does not drive the rover.`:'In range. Stop and operate the rover arm.'};
 }
 if(!s.survey)return {label:'RECORD SEISMIC SURVEY',action:'survey',hint:'Record eight seconds of simulated surface vibrations.'};
 if(!s.photos.length)return {label:'CAPTURE SURFACE PHOTO',action:'camera',hint:'Take an actual picture of the current game view for your observation gallery.'};
 return {label:'TRANSMIT RESULTS TO EARTH',action:'transmit',hint:'Send both sample analyses, the seismic trace, and your photos. Physical samples stay on the Moon.'};
}
export default function LunarSurfacePanel({s,act,onPhoto,onView,onMove,scienceOnly=false}){
 const next=nextSurfaceAction(s),busy=Boolean(s.operation),moving=Boolean(s.rover.target);
 const run=action=>{if(action==='camera')onPhoto();else act(action);};
 const pad=(label,x,z)=><button aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);onMove(x,z);}} onPointerUp={()=>onMove(0,0)} onPointerCancel={()=>onMove(0,0)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onMove(x,z);}}} onKeyUp={()=>onMove(0,0)}>{label}</button>;
 return <>
  {!scienceOnly&&<><div className="lm-next-step"><small>DO THIS NEXT</small><h3>{busy?`Working: ${s.operation.kind}`:moving?`Driving to ${SURFACE_TARGETS[s.rover.target].label}`:next.label}</h3><p>{busy?'Watch the rover arm and wait for the operation to finish.':moving?'The rover is moving across the surface. You can also steer it with arrow keys.':next.hint}</p>
   {busy?<div className="lm-progress"><i style={{width:`${s.operation.elapsed/s.operation.duration*100}%`}}/></div>:<button className="lm-primary" disabled={moving||next.outOfRange} onClick={()=>run(next.action)}>{moving?'AUTO DRIVE ACTIVE':next.label}</button>}
  </div>
  {s.rover.deployed&&<>
   <div className="lm-row"><button onClick={onView}>ROVER CAMERA / ENABLE KEYS</button><button onClick={()=>act('goto:lander')}>AUTO DRIVE TO LANDER</button></div>
   <small>MANUAL DRIVE · Hold arrow keys / WASD or these buttons. Collection never drives automatically. Optional auto drive is labelled below.</small>
   <div className="lm-rover-pad">{pad('↑ Forward',0,-1)}{pad('← Left',-1,0)}{pad('↓ Back',0,1)}{pad('→ Right',1,0)}</div>
   <div className="lm-target-list">{Object.entries(SURFACE_TARGETS).filter(([key])=>key!=='lander').map(([key,t])=>{const done=key==='sensor'?s.instrument:s.samples[key];return <div key={key} className={done?'done':''}><b>{done?'✓ ':''}{t.label}</b><small>{t.description}</small><span>{distanceTo(s,key).toFixed(1)} m from rover · {distanceTo(s,key)<=1.8?'IN ARM REACH':'DRIVE CLOSER'}</span><button disabled={busy||done} onClick={()=>act(`goto:${key}`)}>AUTO DRIVE TO {t.label.toUpperCase()}</button></div>;})}</div>
  </>}
  </>}<h3 className="lm-small-heading">SAMPLE INVENTORY</h3>
  <div className="lm-inventory"><span>{s.samples.basalt?'✓ Basalt rock · 420 g':'○ Basalt rock · not collected'}</span><span>{s.samples.regolith?'✓ Lunar soil · 180 g':'○ Lunar soil · not collected'}</span><span>{s.instrument?'✓ Seismometer deployed':'○ Seismometer packed'}</span></div>
  {(s.instrument||s.survey)&&<div className="lm-seismic"><small>SIMULATED SEISMIC TRACE · {s.survey?'SURVEY SAVED':`${s.surveyTime.toFixed(1)} / 8 s`}</small><svg viewBox="0 0 300 65" role="img" aria-label="Simulated lunar seismic reading"><path d={`M ${Array.from({length:Math.max(1,Math.round((s.survey?1:s.surveyTime/8)*100))},(_,i)=>`${i*3},${33+Math.sin(i*2.1)*Math.sin(i*.21)*12+Math.cos(i*.7)*4}`).join(' L ')}`} fill="none" stroke="#aad2bb" strokeWidth="1.4"/></svg></div>}
  <h3 className="lm-small-heading">SURFACE OBSERVATIONS · {s.photos.length}/3</h3><button disabled={s.photos.length>=3} onClick={onPhoto}>CAPTURE SURFACE PHOTO</button>
  <div className="lm-surface-gallery">{s.photos.map((photo,i)=><figure key={photo.id}><img src={photo.url} alt={`Lunar surface observation ${i+1}`}/><figcaption>OBS {i+1} · <a download={`Lunar-Observation-${i+1}.png`} href={photo.url}>SAVE PNG</a></figcaption></figure>)}</div>
 </>;
}
