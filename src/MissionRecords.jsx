import { useEffect, useState } from 'react';
import { readRecords, downloadRecords } from './missionRecords.js';
export default function MissionRecords() {
  const [rows,setRows]=useState(readRecords),[filter,setFilter]=useState('all');
  useEffect(()=>{const refresh=()=>setRows(readRecords());window.addEventListener('storage',refresh);window.addEventListener('mission-records-changed',refresh);return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('mission-records-changed',refresh);};},[]);
  const shown=rows.filter(r=>filter==='all'||r.mission===filter);
  return <div className="archive"><div className="eyebrow">MISSION ARCHIVE</div><h2>MISSION RECORDS</h2>
    <p className="small-note">Results save on this browser after each completed or failed attempt. Earlier flights played before this update cannot be recovered.</p>
    <label>MISSION <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All missions</option><option value="earth">Earth</option><option value="lunar">Moon</option><option value="mars">Mars</option></select></label>
    <button className="action" disabled={!rows.length} onClick={()=>downloadRecords(rows)}>EXPORT RECORDS</button>
    {!shown.length&&<div className="info-card"><strong>NO RECORDED FLIGHTS YET</strong><p>Finish a mission to save its result here.</p></div>}
    {shown.map(r=><article className="info-card" key={r.id}><strong>{r.mission.toUpperCase()} / {r.result.toUpperCase()}</strong><h3>{r.name}</h3><p>{new Date(r.completedAt).toLocaleString()}<br/>Mission time {Math.round(r.seconds)} s · Fuel remaining {Math.round(r.fuel)} · Photos {r.photos}<br/>{r.assist?'Assisted flight':'Manual flight'}</p>{r.detail&&<p>{r.detail}</p>}</article>)}
  </div>;
}
