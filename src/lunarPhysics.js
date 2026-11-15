import {initialSurface,surfaceCommand,stepSurface} from './lunarSurface.js';
// SI units. Two-body lunar motion with finite thrust and propellant consumption.
// The interplanetary leg uses a clearly labelled, idealized Earth–Moon transfer.
export const MOON_RADIUS=1737400, MOON_MU=4.9048695e12, G0=9.80665;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createMission(stats={},rocketStats={mass:32.99,fuel:2580,thrust:2220}){
 const wetMass=Math.max(1000,Number(stats.mass||10)*1000);
 const fuel=clamp(Number(stats.fuel||0)*8,0,wetMass*.85),dryMass=wetMass-fuel;
 return {...initialSurface(),phase:'briefing',launchTime:0,separationTime:0,boostersSeparated:false,fairingSeparated:false,launchFuel:(rocketStats.fuel||0)*8,initialLaunchFuel:(rocketStats.fuel||0)*8,launchStackMass:(rocketStats.mass||0)*1000+50000+wetMass,launchThrust:(rocketStats.thrust||0)*1000,milestones:{parking:false,transfer:false,orbit:false,landing:false},time:0,transferTime:0,transferDuration:432000,altitude:0,vertical:0,horizontal:0,angle:0,
 dryMass,fuel,initialFuel:fuel,thrust:Math.max(0,Number(stats.thrust||0)*1000),isp:311,
 serviceFuel:45000,serviceDry:5000,throttle:0,pitch:0,engine:false,auto:true,legs:false,
 battery:100,solar:false,warp:1,science:false,transmitted:false,sample:false,
 contactVertical:null,contactHorizontal:null,reason:'',events:['Flight director standing by.']};
}
export function announce(s,text){s.events=[text,...s.events].slice(0,12);}
function serviceBurn(s,dv){
 const mass=s.serviceDry+s.serviceFuel+s.dryMass+s.fuel;
 const used=mass*(1-Math.exp(-dv/(450*G0)));
 if(used>s.serviceFuel){announce(s,'Transfer burn rejected: insufficient service-stage propellant.');return false;}
 s.serviceFuel-=used;return true;
}
export function command(s,action,payload){
 if(surfaceCommand(s,action,payload))return;
 if(action==='park'&&s.phase==='briefing'){if(s.launchThrust<=s.launchStackMass*G0*1.05){announce(s,'Launch rejected: the rocket cannot lift this mission stack. Add lift thrust or reduce mass.');return;}s.phase='launch';s.launchTime=0;s.altitude=0;s.warp=1;announce(s,'Launch countdown started. The service booster will carry your assembled lander into Earth orbit.');}
 if(action==='transfer'&&s.phase==='parking'){
  if(!s.solar){announce(s,'Deploy the solar array before departure to support the five-day coast.');return;}
  if(serviceBurn(s,3150)){s.phase='transfer';s.warp=10000;announce(s,'Trans-lunar injection complete: 3,150 m/s. Five-day transfer underway.');}
 }
 if(action==='skipCoast'&&s.phase==='transfer'){step(s,s.transferDuration-s.transferTime);announce(s,'Coast fast-forwarded. Lunar encounter reached; perform orbit insertion.');}
 if(action==='capture'&&s.phase==='arrival'&&serviceBurn(s,900)){
  s.milestones.orbit=true;s.phase='orbit';s.altitude=100000;s.horizontal=Math.sqrt(MOON_MU/(MOON_RADIUS+s.altitude));s.vertical=0;s.warp=1;
  announce(s,'Lunar orbit insertion complete: 900 m/s. Stable 100 km orbit.');
 }
 if(action==='descend'&&s.phase==='orbit'){s.phase='separation';s.separationTime=0;s.engine=false;s.auto=true;s.warp=1;announce(s,'Lander undocking. The transfer stage stays in lunar orbit.');}
 if(action==='stageBoosters'&&s.phase==='launch'&&s.launchTime>=30&&!s.boostersSeparated){s.boostersSeparated=true;s.boosterSeparationTime=s.launchTime;announce(s,'Booster pair jettisoned. Core ascent continues.');}
 if(action==='stageFairing'&&s.phase==='launch'&&s.altitude>=60000&&!s.fairingSeparated){s.fairingSeparated=true;s.fairingSeparationTime=s.launchTime;announce(s,'Payload fairing jettisoned. Your lunar lander is now exposed.');}
 if(action==='legs'&&['orbit','descent'].includes(s.phase)){s.legs=true;announce(s,'Landing legs extended and locked.');}
 if(action==='solar'&&['briefing','launch'].includes(s.phase)){announce(s,'Keep solar arrays stowed until Earth orbit.');return;}
 if(action==='solar'&&!['failed','success'].includes(s.phase)){s.solar=!s.solar;announce(s,s.solar?'Solar array deployed.':'Solar array retracted.');}
 if(action==='auto'&&s.phase==='descent'){s.auto=!s.auto;s.warp=1;announce(s,s.auto?'Landing guidance engaged.':'Manual guidance. W/S throttle, A/D tilt, X cutoff.');}
 if(action==='cut'&&s.phase==='descent'){s.auto=false;s.engine=false;s.throttle=0;s.warp=1;announce(s,'Engine cutoff. Gravity remains active.');}
 if(action==='ignite'&&s.phase==='descent'&&s.fuel>0&&s.battery>0){s.engine=true;announce(s,'Descent engine enabled.');}

}
export function step(s,dt){
 if(['briefing','failed','success'].includes(s.phase))return;
 s.time+=dt;
 s.battery=clamp(s.battery+(s.solar?.004:-.0003)*dt,0,100);
 if(s.phase==='separation'){s.separationTime+=dt;s.angle+=s.horizontal/(MOON_RADIUS+s.altitude)*dt;if(s.separationTime>=4){s.phase='descent';s.engine=true;s.warp=10;announce(s,'Separation complete. Lander engine ignition; powered descent guidance engaged.');}return;}
 if(s.phase==='launch'){s.launchTime=Math.min(93,s.launchTime+dt);if(s.launchTime>=3)s.warp=5;const p=clamp((s.launchTime-3)/90,0,1);s.altitude=200000*p*p;s.launchFuel=s.initialLaunchFuel*(1-p*.87);if(s.launchTime>=48&&!s.boostersSeparated){s.boostersSeparated=true;s.boosterSeparationTime=s.launchTime;announce(s,'Booster burnout. Booster pair separated automatically.');}if(s.altitude>=80000&&!s.fairingSeparated){s.fairingSeparated=true;s.fairingSeparationTime=s.launchTime;announce(s,'Fairing separated above the atmosphere. Lunar lander exposed.');}s.vertical=p<1?400000*p/90:0;if(s.launchTime>=93){s.phase='parking';s.vertical=0;s.horizontal=7788;s.warp=1;s.milestones.parking=true;announce(s,'200 km Earth orbit reached. Booster separated. Deploy solar, then begin the Moon transfer.');}return;}
 if(['landed','transmitting'].includes(s.phase)){stepSurface(s,dt);return;}
 if(['parking','arrival'].includes(s.phase))return;
 if(s.phase==='transfer'){
  s.transferTime=Math.min(s.transferDuration,s.transferTime+dt);
  if(s.transferTime>=s.transferDuration){s.milestones.transfer=true;s.phase='arrival';s.altitude=100000;s.horizontal=Math.sqrt(MOON_MU/(MOON_RADIUS+100000))+900;s.vertical=0;s.warp=1;announce(s,'Lunar encounter. Execute orbit insertion before beginning descent.');}
  return;
 }
 if(s.phase==='landed')return;
 const r=MOON_RADIUS+s.altitude,g=MOON_MU/(r*r),mass=s.dryMass+s.fuel;
 if(s.phase==='descent'&&s.auto&&s.engine&&s.fuel>0&&s.battery>0){
  // Brake sideways while descending; taper descent velocity toward the surface.
  const target=s.altitude<100?-clamp(s.altitude*.04+.5,.5,5):-Math.min(180,Math.max(.65,Math.sqrt(Math.max(0,s.altitude)*.45)));
  const ax=clamp(-s.horizontal/35,-5,5);
  const ay=g-s.horizontal*s.horizontal/r+clamp((target-s.vertical)*.2,-2,5);
  const acceleration=Math.hypot(ax,ay);
  s.pitch=Math.atan2(ax,ay)*180/Math.PI;
  s.throttle=clamp(acceleration*mass/s.thrust*100,0,100);
  if(s.altitude<2500&&!s.legs){s.legs=true;announce(s,'Landing guidance: gear down.');}
 }
 let thrust=s.phase==='descent'&&s.engine&&s.battery>0&&s.fuel>0?s.thrust*s.throttle/100:0;
 const required=thrust/(s.isp*G0)*dt;
 if(required>s.fuel)thrust*=s.fuel/required;
 s.fuel=Math.max(0,s.fuel-required);
 const a=thrust/mass,tilt=s.pitch*Math.PI/180;
 s.horizontal+=(a*Math.sin(tilt)-s.horizontal*s.vertical/r)*dt;
 s.vertical+=(a*Math.cos(tilt)-g+s.horizontal*s.horizontal/r)*dt;
 s.angle+=s.horizontal/r*dt;
 s.altitude+=s.vertical*dt;
 if(s.altitude<=0){
  s.contactVertical=Math.abs(s.vertical);s.contactHorizontal=Math.abs(s.horizontal);
  const safe=s.legs&&s.contactVertical<=3&&s.contactHorizontal<=1.5&&Math.abs(s.pitch)<=10;
  s.phase=safe?'landed':'failed';s.reason=safe?'Soft touchdown confirmed.':!s.legs?'Landing gear was not deployed.':s.contactVertical>3?'Vertical touchdown speed exceeded 3 m/s.':s.contactHorizontal>1.5?'Lateral touchdown speed exceeded 1.5 m/s.':'Lander tilt exceeded 10 degrees.';
  s.altitude=0;s.engine=false;s.throttle=0;s.warp=1;
  if(safe){s.milestones.landing=true;s.horizontal=0;s.vertical=0;s.pitch=0;}
  announce(s,s.reason);
 }
}
