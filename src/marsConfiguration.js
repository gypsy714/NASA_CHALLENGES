/** AI-assisted payload configuration. Values are game-design approximations. */
export const MARS_MODULES = [
  {id:'mobility',name:'Six-wheel mobility',detail:'Wheels, suspension and drive motors',mass:220,cost:3000,max:1},
  {id:'battery',name:'Battery pack',detail:'100 energy units per pack',mass:35,cost:450,max:3},
  {id:'power',name:'Onboard power unit',detail:'Recharges the parked rover',mass:55,cost:1600,max:1},
  {id:'camera',name:'Mast camera',detail:'Landscape photography and navigation',mass:25,cost:1500,max:1},
  {id:'scanner',name:'Rock spectrometer',detail:'Records simulated mineral spectra',mass:40,cost:1800,max:1},
  {id:'arm',name:'Sample arm',detail:'Robotic rock collection and analysis',mass:65,cost:1400,max:1},
  {id:'antenna',name:'High-gain antenna',detail:'Sends your science records to Earth',mass:15,cost:1900,max:1},
  {id:'engine',name:'Landing engine cluster',detail:'22 kN thrust per cluster',mass:170,cost:3200,max:2},
  {id:'shield',name:'Entry heat shield',detail:'Protects the rover during atmospheric entry',mass:85,cost:1150,max:1},
  {id:'chute',name:'Supersonic parachute',detail:'Slows descent before thruster ignition',mass:35,cost:600,max:1},
  {id:'legs',name:'Landing struts',detail:'Supports the touchdown platform',mass:90,cost:1200,max:1},
  {id:'tank',name:'Descent propellant tank',detail:'250 kg propellant plus 57.5 kg tank',mass:57.5,cost:750,max:4},
  {id:'cruiseTank',name:'Transfer reserve tank',detail:'260 kg transfer propellant. Travels with the rocket, not the landed rover.',mass:60,cost:900,max:3},
];
export const DEFAULT_MARS_CONFIGURATION = Object.fromEntries(MARS_MODULES.map(module=>[module.id,['tank','cruiseTank'].includes(module.id)?2:1]));
export const PAYLOAD_PART_IDS = new Set(['rover','science','camera','legs','shield','parachute','deepAntenna','solar']);
export function payloadStats(configuration=DEFAULT_MARS_CONFIGURATION) {
  const stats=MARS_MODULES.reduce((result,module)=>{
    const count=Math.max(0,Math.min(module.max,Number(configuration[module.id])||0));
    if(module.id!=='cruiseTank')result.dryMass+=module.mass*count;
    result.cost+=module.cost*count;
    return result;
  },{dryMass:350,cost:4000});
  stats.fuel=(configuration.tank||0)*250;
  stats.mass=(stats.dryMass+stats.fuel)/1000;
  stats.thrust=(configuration.engine||0)*22;
  stats.battery=(configuration.battery||0)*100;
  stats.transferFuel=(configuration.cruiseTank||0)*260;
  stats.cruiseMass=(configuration.cruiseTank||0)*60+stats.transferFuel;
  return stats;
}
export function payloadChecks(configuration) {
  return MARS_MODULES.map(module=>({id:module.id,label:module.name,ok:(configuration[module.id]||0)>=(['tank','cruiseTank'].includes(module.id)?2:1)}));
}
