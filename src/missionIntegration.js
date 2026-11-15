/** Shared crew telemetry and local archive. AI assistance: AI_USAGE.md. */
import { useEffect, useRef } from 'react';
import { saveRecord } from './missionRecords.js';
let current = null;
const listeners = new Set();
export const crewBridge = {
  subscribe(fn) { listeners.add(fn); fn(current?.snapshot || null); return () => listeners.delete(fn); },
  command(action,value) { return current?.handler(action,value); },
};
export function useMissionIntegration(mission,name,state,handler,{enabled=true,record=true,photos=0}={}) {
  const latest = useRef({state,handler,photos});
  useEffect(() => { latest.current = {state,handler,photos}; },[state,handler,photos]);
  useEffect(() => {
    if (!enabled) return;
    const owner = {};
    let id = crypto.randomUUID(), ended = false;
    const emit = () => {
      const {state:s,handler:command,photos:count} = latest.current;
      if (ended && !['success','failed','landed','transmitting'].includes(s.phase)) { id=crypto.randomUUID(); ended=false; }
      const snapshot = {
        attemptId:id,mission,name,phase:s.phase,time:s.time||0,
        altitude:s.altitude||0,vertical:s.vertical||0,fuel:s.fuel||0,
        serviceFuel:s.serviceFuel||0,battery:s.rover?.battery??s.battery??0,
        throttle:s.throttle||0,pitch:s.pitch??s.bank??0,warp:s.warp||1,
        photos:count || (s.photo?1:0) || s.photos?.length || 0,
        scan:!!s.scan,sample:!!(s.sample||s.samples?.regolith),
        transmitted:!!s.transmitted||s.phase==='success',
        message:s.message||s.failure||s.reason||s.events?.[0]||'',
        rover:s.rover?{x:s.rover.x,z:s.rover.z,speed:s.rover.speed||0}:null,
        assist:!!(s.orbitDemo||s.auto||s.guidance),
      };
      if (record && ['success','failed','landed'].includes(s.phase) && !ended && !(mission==='lunar'&&s.phase==='landed') && !(mission==='mars'&&s.phase==='landed')) {
        const result = {id,mission,name,result:s.phase,completedAt:new Date().toISOString(),seconds:s.time||0,fuel:s.fuel||0,photos:snapshot.photos,assist:snapshot.assist,detail:snapshot.message};
        snapshot.record = result;
        if (saveRecord(result)) ended=true;
        else snapshot.archiveWarning='Browser storage is full or unavailable. Export existing records to free space.';
      }
      if(current?.owner===owner && current.snapshot.record && ended) snapshot.record=current.snapshot.record;
      current={owner,snapshot,handler:command};
      for (const fn of listeners) fn(snapshot);
    };
    emit(); const timer=setInterval(emit,500);
    return () => { clearInterval(timer); if(current?.owner===owner){current=null;for(const fn of listeners)fn(null);} };
  },[enabled,mission,name,record]);
}

