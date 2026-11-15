/** In-memory cooperative rooms. AI-assisted code, documented in AI_USAGE.md. */
import { randomBytes } from 'node:crypto';
export const roleActions = {
  flight: ['throttle','pitch','warp','cut','ignite','bank','correct','burn','entry','chute','powered','park','transfer','captureOrbit','descend'],
  engineer: ['solar','legs','parachute','guidance','deploy','deployRover','antenna','cut'],
  scientist: ['photo','payload','capture','transmit','scan','sample','collectBasalt','collectRegolith','deploySensor','survey'],
};
export function createCrewService() {
  const rooms=new Map();
  const send=(client,event,data)=>{if(!client.res?.destroyed)client.res?.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);};
  const view=room=>({code:room.code,crew:[...room.members.values()].map(m=>({name:m.name,role:m.role,online:!!m.res})),snapshot:room.snapshot});
  const broadcast=room=>{for(const member of room.members.values())send(member,'state',view(room));};
  const closeRoom=room=>{for(const m of room.members.values()){send(m,'closed',{});m.res?.end();}rooms.delete(room.code);};
  const cleanup=setInterval(()=>{for(const room of rooms.values()){if(Date.now()-room.touched>2*60*60*1000){closeRoom(room);continue;}for(const [token,m] of room.members)if(!m.res&&Date.now()-m.seen>60000){if(m.role==='commander'){closeRoom(room);break;}room.members.delete(token);broadcast(room);}}},15000);
  cleanup.unref?.();
  const handle=async(req,res,next=()=>{res.statusCode=404;res.end();})=>{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/api/crew/'))return next();
    res.setHeader('Cache-Control','no-store');
    const reply=(status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return reply(403,{error:'Open the game and room on the same server address.'});
    try{
      let body={};
      if(req.method==='POST'){
        if(!req.headers['content-type']?.startsWith('application/json'))return reply(415,{error:'JSON required.'});
        let data='';for await(const chunk of req){data+=chunk;if(data.length>64000)return reply(413,{error:'Request too large.'});}body=JSON.parse(data||'{}');
      }
      const action=url.pathname.split('/').pop();
      if(action==='create'&&req.method==='POST'){
        if(rooms.size>=64)return reply(503,{error:'Server is full. Try later.'});
        let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));
        const token=randomBytes(24).toString('hex'),name=String(body.name||'Commander').trim().slice(0,30)||'Commander';
        rooms.set(code,{code,members:new Map([[token,{name,role:'commander',seen:Date.now()}]]),snapshot:null,touched:Date.now()});
        return reply(200,{code,token,role:'commander',name});
      }
      const code=String(body.code||url.searchParams.get('code')||'').toUpperCase(),room=rooms.get(code);
      if(!room)return reply(404,{error:'Room not found. Check the code and server address.'});
      if(action==='join'&&req.method==='POST'){
        const role=body.role;if(!roleActions[role])return reply(400,{error:'Choose a crew role.'});
        if(room.members.size>=4||[...room.members.values()].some(m=>m.role===role))return reply(409,{error:'That role is occupied. Choose another role.'});
        const token=randomBytes(24).toString('hex'),name=String(body.name||'Crew').trim().slice(0,30)||'Crew';
        room.members.set(token,{name,role,seen:Date.now()});room.touched=Date.now();broadcast(room);
        return reply(200,{code,token,role,name});
      }
      const token=body.token||url.searchParams.get('token'),member=room.members.get(token);
      if(!member)return reply(403,{error:'Your room session has expired. Rejoin the room.'});
      member.seen=Date.now();room.touched=Date.now();
      if(action==='events'&&req.method==='GET'){
        res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});
        member.res?.end();member.res=res;broadcast(room);
        const heartbeat=setInterval(()=>{res.write(': heartbeat\n\n');member.seen=Date.now();room.touched=Date.now();},15000);
        req.on('close',()=>{clearInterval(heartbeat);if(member.res===res){member.res=null;member.seen=Date.now();broadcast(room);}});return;
      }
      if(req.method!=='POST')return reply(405,{error:'Method not allowed.'});
      if(action==='publish'){
        if(member.role!=='commander')return reply(403,{error:'Only the commander publishes the simulation.'});
        const s=body.snapshot;
        if(s!==null&&(!s||typeof s!=='object'||typeof s.phase!=='string'||!['earth','lunar','mars','mars-launch'].includes(s.mission)))return reply(400,{error:'Invalid telemetry.'});
        room.snapshot=s;broadcast(room);return reply(200,{ok:true});
      }
      if(action==='command'){
        if(!roleActions[member.role]?.includes(body.action))return reply(403,{error:'That command belongs to another crew role.'});
        if(!room.snapshot||['success','failed'].includes(room.snapshot.phase))return reply(409,{error:'Wait for an active mission.'});
        const host=[...room.members.values()].find(m=>m.role==='commander');
        if(!host.res)return reply(409,{error:'Commander disconnected. Waiting for reconnection.'});
        if(member.lastCommand&&Date.now()-member.lastCommand<100)return reply(429,{error:'Please wait briefly between commands.'});
        if(body.value!==undefined&&typeof body.value!=='number'&&typeof body.value!=='boolean')return reply(400,{error:'Invalid command value.'});
        member.lastCommand=Date.now();send(host,'command',{action:body.action,value:body.value,from:member.name,role:member.role});
        return reply(200,{ok:true});
      }
      if(action==='leave'){
        if(member.role==='commander')closeRoom(room);else{member.res?.end();room.members.delete(token);broadcast(room);}return reply(200,{ok:true});
      }
      return reply(404,{error:'Unknown room operation.'});
    }catch{return reply(400,{error:'Could not process the room request.'});}
  };
  return {handle,close(){clearInterval(cleanup);for(const room of rooms.values())closeRoom(room);}};
}
