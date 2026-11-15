import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createCrewService } from '../crewServer.mjs';
test('cooperative rooms deliver commands and enforce membership and roles',async()=>{
  const service=createCrewService();
  const server=http.createServer((req,res)=>service.handle(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=async(action,body)=>{const r=await fetch(`${base}/api/crew/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  const controller=new AbortController();let reader;
  try{
    const host=(await post('create',{name:'Commander'})).data;
    const flight=(await post('join',{code:host.code,name:'Pilot',role:'flight'})).data;
    const science=(await post('join',{code:host.code,name:'Science',role:'scientist'})).data;
    const engineer=(await post('join',{code:host.code,name:'Systems',role:'engineer'})).data;
    assert.equal((await post('join',{code:host.code,role:'flight'})).status,409);
    assert.equal((await post('publish',{...flight,snapshot:{}})).status,403);
    const stream=await fetch(`${base}/api/crew/events?code=${host.code}&token=${host.token}`,{signal:controller.signal});
    reader=stream.body.getReader();
    const initial=new TextDecoder().decode((await reader.read()).value);assert.match(initial,/Commander/);
    const snapshot={attemptId:'test',mission:'mars',phase:'cruise',fuel:500,serviceFuel:227};
    assert.equal((await post('publish',{...host,snapshot})).status,200);
    assert.equal((await post('command',{...science,action:'correct',value:-1})).status,403);
    assert.equal((await post('command',{...flight,action:'correct',value:-1})).status,200);
    let events='';while(!events.includes('event: command'))events+=new TextDecoder().decode((await reader.read()).value);
    assert.match(events,/"action":"correct"/);assert.match(events,/"from":"Pilot"/);
    assert.equal((await post('command',{...engineer,action:'antenna'})).status,200);
    assert.equal((await post('publish',{...host,snapshot:{...snapshot,phase:'success'}})).status,200);
    await new Promise(resolve=>setTimeout(resolve,120));
    assert.equal((await post('command',{...flight,action:'correct',value:-1})).status,409);
    assert.equal((await post('leave',science)).status,200);
    assert.equal((await post('join',{code:host.code,name:'New scientist',role:'scientist'})).status,200);
    assert.equal((await post('leave',host)).status,200);
    assert.equal((await post('publish',{...host,snapshot})).status,404);
  }finally{controller.abort();await reader?.cancel().catch(()=>{});service.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
