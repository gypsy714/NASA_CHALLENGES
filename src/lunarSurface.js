export const SURFACE_TARGETS={
 basalt:{x:8,z:-3,label:'B01 · Basalt rock',description:'Dark volcanic rock. Collect a 420 g specimen to study ancient lunar lava.'},
 regolith:{x:10,z:4,label:'S02 · Lunar soil',description:'Loose regolith: dust and broken rock. Collect 180 g for grain-size analysis.'},
 sensor:{x:5,z:8,label:'I03 · Seismic station',description:'Deploy a seismometer, then record a simulated vibration survey.'},
 lander:{x:4,z:2,label:'Lander parking spot',description:'Return the rover beside the spacecraft.'},
};
export const distanceTo=(s,key)=>Math.hypot(s.rover.x-SURFACE_TARGETS[key].x,s.rover.z-SURFACE_TARGETS[key].z);
export function initialSurface(){return {rover:{deployed:false,x:4,z:2,heading:0,speed:0,cruiseSpeed:1.7,target:null,input:{x:0,z:0}},samples:{basalt:false,regolith:false},instrument:false,survey:false,surveyTime:0,photos:[],operation:null,transmitTime:0};}
export function surfaceCommand(s,action,payload){
 if(s.phase!=='landed')return null;
 const report=text=>{s.events=[text,...s.events].slice(0,12);return true;};
 if(action==='deployRover'){
  if(!s.rover.deployed&&s.battery>2){s.rover.deployed=true;s.battery-=2;return report('Rover deployed. First target: B01 basalt rock. Drive with arrow keys or choose DRIVE TO TARGET.');}
  return true;
 }
 if(action==='stopRover'){s.rover.target=null;s.rover.input={x:0,z:0};s.rover.speed=0;return report('Rover stopped.');}
 if(action.startsWith('goto:')){
  const key=action.slice(5);if(!SURFACE_TARGETS[key])return true;
  if(!s.rover.deployed)return report('Deploy the surface rover first.');
  if(s.operation)return report('Wait for the current operation to finish.');
  s.rover.target=key;s.rover.input={x:0,z:0};return report(`Driving to ${SURFACE_TARGETS[key].label}. You can steer manually at any time.`);
 }
 if(['collectBasalt','collectRegolith','deploySensor'].includes(action)){
  if(!s.rover.deployed)return report('Deploy the surface rover first.');
  const key=action==='collectBasalt'?'basalt':action==='collectRegolith'?'regolith':'sensor';
  if(distanceTo(s,key)>1.8)return report(`Drive within 1.8 metres of ${SURFACE_TARGETS[key].label} before operating the rover arm.`);
  if(s.operation||s.samples[key]||(key==='sensor'&&s.instrument))return true;
  s.rover.target=null;s.rover.input={x:0,z:0};s.operation={kind:key,elapsed:0,duration:key==='sensor'?4:3};
  return report(key==='sensor'?'Placing seismic instrument on the surface...':`Rover arm collecting ${key==='basalt'?'basalt rock':'lunar soil'}...`);
 }
 if(action==='survey'){
  if(!s.instrument)return report('Deploy the seismometer at I03 first.');
  if(s.survey||s.operation)return true;
  s.operation={kind:'survey',elapsed:0,duration:8};return report('Recording simulated lunar vibrations. Keep the instrument stationary.');
 }
 if(action==='photo'){
  if(!payload?.startsWith('data:image/png'))return report('Photo capture failed. Please retry.');
  if(s.photos.length>=3)return report('Photo gallery full: three surface observations saved.');
  s.photos.push({url:payload,id:Date.now(),x:s.rover.x,z:s.rover.z});s.battery=Math.max(0,s.battery-1);
  return report('Surface photo saved. Open the observation gallery to view or download it.');
 }
 if(action==='transmit'){
  if(!s.samples.basalt||!s.samples.regolith||!s.instrument||!s.survey||!s.photos.length)return report('Finish both samples, the seismic survey, and at least one surface photo before transmitting.');
  if(s.battery<=3)return report('Electrical charge too low. Deploy the solar array and recharge.');
  s.phase='transmitting';s.warp=1;s.transmitTime=0;s.rover.speed=0;s.battery-=3;s.rover.target=null;s.rover.input={x:0,z:0};
  return report('Uplinking sample analyses, seismic readings, and surface photos to Earth...');
 }
 // Retired shortcuts must not bypass the actual surface objectives.
 if(action==='sample'||action==='science')return report('Use the rover to collect both samples and deploy the seismic station.');
 return null;
}
export function stepSurface(s,dt){
 if(s.phase==='transmitting'){
  s.transmitTime=Math.min(8,s.transmitTime+dt);
  if(s.transmitTime>=8){s.transmitted=true;s.phase='success';s.events=['MISSION SUCCESS — both sample analyses, seismic survey, and surface photos received on Earth.',...s.events].slice(0,12);}
  return;
 }
 const rover=s.rover;rover.speed=0;if(!rover.deployed)return;
 if(s.operation){
  s.operation.elapsed=Math.min(s.operation.duration,s.operation.elapsed+dt);
  if(s.operation.kind==='survey')s.surveyTime=s.operation.elapsed;
  if(s.operation.elapsed>=s.operation.duration){
   const kind=s.operation.kind;s.operation=null;
   const text=kind==='basalt'?'B01 collected: 420 g basalt specimen. Onboard analysis identifies volcanic rock.':kind==='regolith'?'S02 collected: 180 g lunar regolith. Grain-size analysis saved.':kind==='sensor'?'I03 seismic station deployed. Start the survey to record vibrations.':'Seismic survey complete. Simulated vibration trace saved.';
   if(kind==='basalt'||kind==='regolith')s.samples[kind]=true;
   if(kind==='sensor')s.instrument=true;if(kind==='survey'){s.survey=true;s.science=true;}
   s.sample=s.samples.basalt&&s.samples.regolith;s.events=[text,...s.events].slice(0,12);
  }return;
 }
 if(s.battery<=0)return;
 let dx=rover.input.x,dz=rover.input.z;
 if(rover.target){const target=SURFACE_TARGETS[rover.target],d=distanceTo(s,rover.target);if(d<1.2){rover.target=null;return;}dx=(target.x-rover.x)/d;dz=(target.z-rover.z)/d;}
 const length=Math.hypot(dx,dz);if(length<.01)return;dx/=length;dz/=length;
 const x=Math.max(-18,Math.min(18,rover.x+dx*rover.cruiseSpeed*dt)),z=Math.max(-18,Math.min(18,rover.z+dz*rover.cruiseSpeed*dt));
 if(Math.hypot(x,z)>3.3){rover.x=x;rover.z=z;rover.speed=rover.cruiseSpeed;rover.heading=Math.atan2(dx,dz);s.battery=Math.max(0,s.battery-.008*dt);}
}
