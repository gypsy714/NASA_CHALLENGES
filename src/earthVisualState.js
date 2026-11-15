export const clamp01 = n => Math.max(0, Math.min(1, n));
export function smoothRange(n, lo, hi) { const t=clamp01((n-lo)/(hi-lo)); return t*t*(3-2*t); }
export function visualHeight(altitude) {
 const a=Math.max(0,altitude);
 // One smooth scale for the whole flight, with no low/high-altitude formula seam.
 return 350*Math.log1p(a/10000);
}
export const visualDownrange = distance => Math.sign(distance)*Math.log1p(Math.abs(distance)/10000)*35;

// The same continuous profile is used in both directions; no altitude scene switch.
export function atmosphereAt(altitude) {
 const a=Math.max(0,altitude), globe=smoothRange(a,65000,110000);
 return {
  darkness:smoothRange(a,10000,80000),
  ground:1-smoothRange(a,30000,70000),
  globe,
  clouds:1-smoothRange(a,14000,26000),
  immersion:smoothRange(a,1200,2800)*(1-smoothRange(a,5500,8500)),
  stars:smoothRange(a,55000,115000),
  horizonDrop:360-90*globe,
 };
}

export function flightShake(f) {
 if(f.phase!=='flight'||f.parachute)return 0;
 const powered=f.engine&&f.fuel>0&&f.throttle>0;
 const throttle=clamp01((f.throttle||0)/100);
 const ignition=powered?Math.exp(-Math.max(0,f.time)/2.6)*.018*throttle:0;
 const engine=powered?.0025*throttle:0;
 const aero=clamp01((f.q||0)/45)*.009*(1-smoothRange(f.altitude,50000,90000));
 return Math.min(.028,ignition+engine+aero);
}

const layers=new WeakMap();
export function setLayerOpacity(root, opacity) {
 if(!root)return;
 const alpha=clamp01(opacity);root.visible=alpha>.0001;
 if(!root.visible)return;
 let items=layers.get(root);
 if(!items){
  const seen=new Set();items=[];
  root.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m&&!seen.has(m)){seen.add(m);items.push({m,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});}});
  layers.set(root,items);
 }
 for(const base of items){
  const {m}=base,transparent=base.transparent||alpha<.9999;
  if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}
  m.depthWrite=alpha<.9999?false:base.depthWrite;
  m.opacity=base.opacity*alpha;
  if(m.uniforms?.layerOpacity)m.uniforms.layerOpacity.value=alpha;
 }
}
