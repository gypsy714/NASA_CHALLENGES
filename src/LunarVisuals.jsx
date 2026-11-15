import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import LunarSurfaceWorld from './LunarSurfaceWorld';
import LunarJourney from './LunarJourney';
import * as THREE from 'three';

const smooth=t=>t*t*(3-2*t);
const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x,z){const a=Math.floor(x),b=Math.floor(z),u=smooth(x-a),v=smooth(z-b);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(a,b),hash(a+1,b),u),THREE.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),u),v);}
const craters=Array.from({length:30},(_,i)=>{const a=i*2.399,r=28+(i*59%460);return {x:Math.cos(a)*r,z:Math.sin(a)*r,r:8+(i*13%38)};});
export function lunarElevation(x,z){
 const distance=Math.hypot(x,z),flat=THREE.MathUtils.smoothstep(distance,4,9);
 let h=noise(x/80,z/80)*3+noise(x/23,z/23)*.6+noise(x/6,z/6)*.12;
 for(const c of craters){const q=Math.hypot(x-c.x,z-c.z)/c.r;if(q<1.65)h+=c.r*(-.16*Math.exp(-q*q*2.7)+.07*Math.exp(-(((q-1)/.15)**2)));}
 return h*flat;
}
function terrainGeometry(size=1200,segments=220,hole=0){
 const g=new THREE.PlaneGeometry(size,size,segments,segments);g.rotateX(-Math.PI/2);
 const p=g.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,lunarElevation(x,z));const shade=.65+noise(x/14,z/14)*.25;colors.push(shade,shade,shade*.995);}
 if(hole){const indices=[],original=g.index.array;for(let i=0;i<original.length;i+=3){const a=original[i],b=original[i+1],c=original[i+2],x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;if(Math.abs(x)>=hole||Math.abs(z)>=hole)indices.push(a,b,c);}g.setIndex(indices);}
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
function surfaceTexture(foil=false){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d'),image=ctx.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const n=hash(x,y),shade=foil?120+Math.sin(x*.17+y*.09+noise(x/12,y/12)*9)*35+Math.sin(x*.47-y*.3)*18:155+n*70+noise(x/14,y/14)*20;
  const i=(y*512+x)*4;image.data[i]=image.data[i+1]=image.data[i+2]=shade;image.data[i+3]=255;
 }ctx.putImageData(image,0,0);
 const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(foil?2:220,foil?2:220);t.anisotropy=8;
 if(!foil)t.colorSpace=THREE.SRGBColorSpace;return t;
}
function Strut({a,b,r=.035,color='#d0ccc1'}){
 const v=useMemo(()=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);return {position:start.add(end).multiplyScalar(.5),rotation:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize()),length:direction.length()};},[a,b]);
 return <mesh position={v.position} quaternion={v.rotation} castShadow><cylinderGeometry args={[r,r,v.length,10]}/><meshStandardMaterial color={color} metalness={.72} roughness={.36}/></mesh>;
}
export function LunarLander({flight,build,assembly=false,onSelect,inspect}){
 const has=id=>!build||build.includes(id);
 const internal=assembly&&['cryoTank','probe','battery','reaction'].includes(inspect);
 const inspectPoints={cryoTank:[0,1.2,0],probe:[0,2.45,0],battery:[.7,1,0],reaction:[0,2.1,0],vacEngine:[0,.45,0],legs:[1.8,.8,1.8],solar:[1.65,1.65,-.1],deepAntenna:[.14,3.7,0],science:[-.6,1.95,.93],rover:[0,1.05,1.44],camera:[.5,2.05,1.01]};
 const hasAntenna=has('antenna')||has('deepAntenna');
 const body=useRef(),gear=useRef(),plume=useRef();
 const foil=useMemo(()=>surfaceTexture(true),[]);
 const foilPanel=useMemo(()=>{const g=new THREE.BoxGeometry(.91,.9,.045,16,16,1),p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getZ(i)>0)p.setZ(i,p.getZ(i)+Math.sin(p.getX(i)*78+p.getY(i)*61)*.009+hash(i,17)*.013);g.computeVertexNormals();return g;},[]);
 useEffect(()=>()=>{foil.dispose();foilPanel.dispose();},[foil,foilPanel]);
 const triangle=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-.37,-.22);s.lineTo(.34,-.22);s.lineTo(.22,.28);s.closePath();return s;},[]);
 useFrame(({clock},dt)=>{
  const f=flight.current;body.current.rotation.z=THREE.MathUtils.damp(body.current.rotation.z,-f.pitch*Math.PI/180,7,dt);
  gear.current.scale.setScalar(THREE.MathUtils.damp(gear.current.scale.x,(assembly?has('legs'):f.legs)?1:.35,5,dt));
  plume.current.visible=f.engine&&f.fuel>0&&f.throttle>0;
  plume.current.scale.set(1,.3+f.throttle*.018+Math.sin(clock.elapsedTime*35)*.025,1);
 });
 return <group ref={body} onClick={onSelect?e=>{e.stopPropagation();let item=e.object;while(item&&!item.userData.part)item=item.parent;const id=item?.userData.part||'probe';let index=build.indexOf(id);if(index<0)index=build.findIndex(x=>x==='capsule'||x==='probe');if(index>=0)onSelect(index);}:undefined}>
  {assembly&&inspect&&has(inspect)&&<group position={inspectPoints[inspect]}>
   <mesh><sphereGeometry args={[.25,16,12]}/><meshBasicMaterial color="#7ef3cf" wireframe transparent opacity={.7} depthTest={false}/></mesh>
   <Html position={[0,.5,0]} center style={{pointerEvents:'none'}}><span className="la-part-callout">{inspect==='cryoTank'?`${build.filter(x=>x==='cryoTank').length}/4 INTERNAL TANKS`:inspect.toUpperCase()} · SELECTED</span></Html>
  </group>}
  {internal&&<>
   {inspect==='cryoTank'&&Array.from({length:build.filter(x=>x==='cryoTank').length},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/2)*.65,1.15,Math.sin(i*Math.PI/2)*.65]}><sphereGeometry args={[.46,20,12]}/><meshStandardMaterial color="#d5d9d2" metalness={.6} roughness={.35}/></mesh>)}
   {inspect==='probe'&&has('probe')&&<mesh position={[0,2.45,0]}><boxGeometry args={[.5,.4,.4]}/><meshStandardMaterial color="#66b8b3"/></mesh>}
   {inspect==='battery'&&has('battery')&&<mesh position={[.7,1,0]}><boxGeometry args={[.4,.55,.5]}/><meshStandardMaterial color="#687bac"/></mesh>}
   {inspect==='reaction'&&has('reaction')&&<mesh position={[0,2.1,0]}><torusGeometry args={[.25,.09,12,24]}/><meshStandardMaterial color="#d0c8aa" metalness={.7}/></mesh>}
  </>}
  {/* Apollo-inspired uncrewed spacecraft; geometry is an illustrative design. */}
  <mesh position={[0,1.12,0]} rotation={[0,Math.PI/8,0]} castShadow receiveShadow><cylinderGeometry args={[1.32,1.32,1.22,8]}/><meshStandardMaterial color="#c7a052" transparent={internal} opacity={internal?.12:1} depthWrite={!internal} metalness={.82} roughness={.36} bumpMap={foil} bumpScale={.055}/></mesh>
  {[0,1,2,3,4,5,6,7].map(i=><group key={i} rotation={[0,i*Math.PI/4,0]}>
   <mesh geometry={foilPanel} position={[0,1.18,1.23]} castShadow><meshStandardMaterial color={i%3?'#d7ae61':'#b88336'} transparent={internal} opacity={internal?.12:1} depthWrite={!internal} metalness={.78} roughness={.4} bumpMap={foil} bumpScale={.065}/></mesh>
   <mesh position={[0,1.69,1.25]}><boxGeometry args={[1.01,.055,.06]}/><meshStandardMaterial color="#48474a" metalness={.55} roughness={.6}/></mesh>
  </group>)}
  <mesh visible={has('engine')||has('vacEngine')||has('ionEngine')} userData={{part:has('vacEngine')?'vacEngine':'engine'}} position={[0,.51,0]} castShadow><cylinderGeometry args={[.27,.48,.58,32,1,true]}/><meshStandardMaterial color="#383a3d" metalness={.82} roughness={.27} side={THREE.DoubleSide}/></mesh>
  <mesh position={[0,.22,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.48,.025,8,48]}/><meshStandardMaterial color="#9e8c70" metalness={.8} roughness={.4}/></mesh>
  <mesh position={[0,2.31,-.06]} castShadow><cylinderGeometry args={[.8,1.02,1.25,8]}/><meshStandardMaterial color="#343638" transparent={internal} opacity={internal?.12:1} depthWrite={!internal} metalness={.35} roughness={.65}/></mesh>
  <mesh position={[0,2.89,-.06]} castShadow><cylinderGeometry args={[.61,.8,.24,8]}/><meshStandardMaterial color="#cbd0cd" metalness={.7} roughness={.34}/></mesh>
  {[-1,1].map(side=><group key={side} position={[side*.53,2.44,.77]} rotation={[0,side*.33,0]}>
   <mesh castShadow><boxGeometry args={[.9,.82,.06]}/><meshStandardMaterial color="#b7babb" metalness={.65} roughness={.4}/></mesh>
   <mesh position={[0,.08,.038]} scale={[side,1,1]}><shapeGeometry args={[triangle]}/><meshPhysicalMaterial color="#0a1722" metalness={.3} roughness={.09} clearcoat={1}/></mesh>
   <mesh position={[0,-.32,.043]}><boxGeometry args={[.82,.035,.025]}/><meshStandardMaterial color="#505357"/></mesh>
  </group>)}
  <mesh position={[0,1.98,.92]} castShadow><boxGeometry args={[.63,.5,.16]}/><meshStandardMaterial color="#bfc1ba" metalness={.65} roughness={.47}/></mesh>
  <mesh position={[0,1.98,1.012]}><boxGeometry args={[.47,.35,.025]}/><meshStandardMaterial color="#55595a" metalness={.45} roughness={.55}/></mesh>
  <mesh position={[-.4,2.42,-.79]} castShadow><sphereGeometry args={[.43,20,12]}/><meshStandardMaterial color="#d3d6d1" metalness={.72} roughness={.4}/></mesh>
  <mesh position={[.47,2.35,-.83]} castShadow><sphereGeometry args={[.4,20,12]}/><meshStandardMaterial color="#909390" metalness={.7} roughness={.38}/></mesh>
  {[0,Math.PI/2,Math.PI,Math.PI*1.5].map(a=><group key={a} rotation={[0,a,0]}>
   <Strut a={[.7,2,0]} b={[1.3,2.2,0]} r={.045}/>
   <mesh position={[1.29,2.2,0]} castShadow><boxGeometry args={[.18,.22,.3]}/><meshStandardMaterial color="#555957" metalness={.6}/></mesh>
   {[-1,1].map(k=><mesh key={k} position={[1.29,2.2,k*.23]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.055,.1,.18,12]}/><meshStandardMaterial color="#47494a" metalness={.7} roughness={.4}/></mesh>)}
  </group>)}
  <group ref={gear} visible={has('legs')} userData={{part:'legs'}}>{[Math.PI/4,Math.PI*.75,Math.PI*1.25,Math.PI*1.75].map(a=><group key={a} rotation={[0,a,0]}>
   <Strut a={[.95,1.63,0]} b={[2.7,.12,0]} r={.052}/>
   <Strut a={[.72,.65,.45]} b={[2.1,.6,0]} r={.031} color="#b59c68"/>
   <Strut a={[.72,.65,-.45]} b={[2.1,.6,0]} r={.031} color="#b59c68"/>
   <mesh position={[1.61,1.06,0]} rotation={[0,0,.84]} castShadow><cylinderGeometry args={[.083,.083,.65,12]}/><meshStandardMaterial color="#bd9b55" metalness={.75} roughness={.37} bumpMap={foil} bumpScale={.025}/></mesh>
   <mesh position={[2.7,.055,0]} castShadow receiveShadow><cylinderGeometry args={[.38,.46,.11,32]}/><meshStandardMaterial color="#a59163" metalness={.66} roughness={.55}/></mesh>
   <mesh position={[2.7,.12,0]}><cylinderGeometry args={[.08,.2,.11,16]}/><meshStandardMaterial color="#c8b786" metalness={.7} roughness={.4}/></mesh>
  </group>)}</group>
  <group visible={hasAntenna} userData={{part:has('deepAntenna')?'deepAntenna':'antenna'}} position={[0,3.03,-.1]}><Strut a={[0,0,0]} b={[.14,.68,0]} r={.022}/><group position={[.14,.68,0]} rotation={[.35,0,-.6]}><mesh castShadow><sphereGeometry args={[.4,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#b5b8b5" metalness={.75} roughness={.32} side={THREE.DoubleSide}/></mesh><Strut a={[0,0,0]} b={[0,.42,0]} r={.014}/></group></group>
  <Strut a={[-.65,2.8,0]} b={[-.65,4,0]} r={.012}/>
  {has('solar')&&<group userData={{part:'solar'}}>{[-1,1].map(side=><group key={side} position={[side*1.65,1.65,-.1]} rotation={[0,0,assembly||flight.current.solar?0:side*Math.PI/2]}><mesh castShadow><boxGeometry args={[.9,.65,.035]}/><meshStandardMaterial color="#14395b" metalness={.5} roughness={.4}/></mesh>{[-.3,0,.3].map(x=><mesh key={x} position={[x,0,.022]}><boxGeometry args={[.013,.63,.008]}/><meshBasicMaterial color="#899fa9"/></mesh>)}</group>)}</group>}
  {has('camera')&&<mesh userData={{part:'camera'}} position={[.5,2.05,1.01]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.1,.11,.21,16]}/><meshStandardMaterial color="#163748" metalness={.65} roughness={.25}/></mesh>}
  {has('science')&&<mesh userData={{part:'science'}} position={[-.6,1.95,.93]} castShadow><boxGeometry args={[.37,.28,.2]}/><meshStandardMaterial color="#dbd8c9" metalness={.55} roughness={.4}/></mesh>}
  {has('rover')&&!flight.current.rover?.deployed&&<mesh userData={{part:'rover'}} position={[0,1.05,1.44]} castShadow><boxGeometry args={[.75,.4,.33]}/><meshStandardMaterial color="#a8aba4" metalness={.6} roughness={.5}/></mesh>}
  <mesh ref={plume} position={[0,-.72,0]} rotation={[Math.PI,0,0]}><coneGeometry args={[.18,1.8,20]}/><meshBasicMaterial color="#b4d4eb" transparent opacity={.16} depthWrite={false}/></mesh>
 </group>;
}
function PhysicalLighting(){
 const {gl,scene}=useThree();
 useEffect(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,128);
  gradient.addColorStop(0,'#030405');gradient.addColorStop(.47,'#07090c');gradient.addColorStop(.52,'#888885');gradient.addColorStop(1,'#666663');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,128);
  const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
  const generator=new THREE.PMREMGenerator(gl),environment=generator.fromEquirectangular(texture),old=scene.environment,oldIntensity=scene.environmentIntensity;
  scene.environment=environment.texture;scene.environmentIntensity=.4;
  return()=>{scene.environment=old;scene.environmentIntensity=oldIntensity;environment.dispose();generator.dispose();texture.dispose();};
 },[gl,scene]);
 return <><ambientLight intensity={.065}/><hemisphereLight args={['#b4c4db','#454443',.16]}/><directionalLight castShadow position={[45,30,35]} intensity={4} color="#fffdf8" shadow-mapSize={[2048,2048]} shadow-camera-left={-80} shadow-camera-right={80} shadow-camera-top={80} shadow-camera-bottom={-80} shadow-camera-near={.5} shadow-camera-far={180} shadow-bias={-.00015} shadow-normalBias={.12}/></>;
}
const hSafe=alt=>alt<1000?alt*.025:25+Math.log1p((alt-1000)/1000)*13;
function LunarSurfaceScene({flight,view,build,captureRequest,onPhoto,onNavigate}){
 const craft=useRef(),surface=useRef(),globe=useRef(),marker=useRef(),earth=useRef(),dust=useRef(),look=useRef(new THREE.Vector3());
 const previousOverview=useRef(null),separatedService=useRef();
 const {gl}=useThree();
 const [moon,height,earthMap,clouds]=useTexture(['/moon-color.jpg','/moon-height.jpg','/earth-observation.jpg','/earth-clouds.png']);
 const grain=useMemo(()=>surfaceTexture(),[]);
 const geometry=useMemo(()=>terrainGeometry(1200,220,1200/220*15),[]);
 const nearGeometry=useMemo(()=>terrainGeometry(1200/220*30,240),[]);
 const nearGrain=useMemo(()=>{const t=grain.clone(),repeat=30/220*grain.repeat.x;t.repeat.set(repeat,repeat);t.offset.set((grain.repeat.x-repeat)/2,(grain.repeat.x-repeat)/2);return t;},[grain]);
 const rocks=useMemo(()=>Array.from({length:180},(_,i)=>{const a=i*2.399,r=11+(i*37%250),x=Math.cos(a)*r,z=Math.sin(a)*r,size=.09+hash(i,4)**4*1.45;return {x,z,y:lunarElevation(x,z),size};}),[]);
 const rockGeometry=useMemo(()=>{const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const amount=.8+hash(i,8)*.4;p.setXYZ(i,p.getX(i)*amount,p.getY(i)*amount,p.getZ(i)*amount);}g.computeVertexNormals();return g;},[]);
 useEffect(()=>{moon.colorSpace=earthMap.colorSpace=clouds.colorSpace=THREE.SRGBColorSpace;moon.anisotropy=earthMap.anisotropy=8;return()=>{grain.dispose();nearGrain.dispose();geometry.dispose();nearGeometry.dispose();rockGeometry.dispose();};},[moon,height,earthMap,clouds,grain,nearGrain,geometry,nearGeometry,rockGeometry]);
 useFrame(({camera},dt)=>{
  const s=flight.current;
  if(captureRequest?.current){captureRequest.current=false;window.setTimeout(()=>{try{onPhoto(gl.domElement.toDataURL('image/png'));}catch{onPhoto(null);}},100);}
  const overview=view==='orbit'||['orbit'].includes(s.phase);
  if(separatedService.current){separatedService.current.visible=s.phase==='separation';separatedService.current.position.set(-s.separationTime*.8,hSafe(s.altitude)-3-s.separationTime*.8,0);separatedService.current.rotation.z=s.separationTime*.12;}
  const h=s.altitude<1000?s.altitude*.025:25+Math.log1p((s.altitude-1000)/1000)*13;
  craft.current.visible=!overview;surface.current.visible=!overview;globe.current.visible=overview;
  craft.current.position.set(0,h,0);
  const surfaceView=view==='surface'&&s.rover?.deployed&&['landed','transmitting','success'].includes(s.phase);
  const roverY=surfaceView?lunarElevation(s.rover.x,s.rover.z):0;
  const target=overview?new THREE.Vector3(0,0,0):surfaceView?new THREE.Vector3(s.rover.x,roverY+.65,s.rover.z):new THREE.Vector3(0,h+1.65,0);
  const pos=overview?new THREE.Vector3(0,16,82):surfaceView?new THREE.Vector3(s.rover.x+6,roverY+3.8,s.rover.z+8):new THREE.Vector3(9.5,h+5.2,13.5);
  if(previousOverview.current!==overview){camera.position.copy(pos);look.current.copy(target);previousOverview.current=overview;}
  camera.position.lerp(pos,1-Math.exp(-dt*3));look.current.lerp(target,1-Math.exp(-dt*4));camera.lookAt(look.current);
  marker.current.position.set(28*Math.sin(s.angle),0,28*Math.cos(s.angle));
  earth.current.position.set(-28,h+12,-105);
  const power=s.engine&&s.fuel>0&&s.altitude<60?s.throttle/100*(1-s.altitude/60):0;
  dust.current.visible=power>.01;dust.current.scale.setScalar(1+power*2.2);
  dust.current.children.forEach((p,i)=>{p.material.opacity=power*.08*(1-i/20);});
 });
 return <>
  <color attach="background" args={['#000103']}/><PhysicalLighting/>
  {/* Exposure is set for a sunlit landscape: bright stars are deliberately absent. */}
  <group ref={globe}><mesh rotation={[0,-.5,0]}><sphereGeometry args={[23,128,96]}/><meshStandardMaterial map={moon} bumpMap={height} bumpScale={.22} roughness={1}/></mesh><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[28,.018,6,160]}/><meshBasicMaterial color="#91b9bf" transparent opacity={.4}/></mesh><mesh ref={marker}><sphereGeometry args={[.3,12,8]}/><meshBasicMaterial color="#f4d7aa"/></mesh></group>
  <group ref={surface}>
   <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#c6c6c6" map={grain} bumpMap={grain} bumpScale={.02} roughness={1} vertexColors/></mesh>
   <mesh geometry={nearGeometry} receiveShadow><meshStandardMaterial color="#c6c6c6" map={nearGrain} bumpMap={nearGrain} bumpScale={.02} roughness={1} vertexColors/></mesh>
   <mesh rotation={[-Math.PI/2,0,0]} position={[0,-14,0]} receiveShadow><planeGeometry args={[18000,18000]}/><meshStandardMaterial color="#68686a" roughness={1}/></mesh>
   {rocks.map((p,i)=><mesh key={i} geometry={rockGeometry} position={[p.x,p.y+p.size*.26,p.z]} scale={[p.size,p.size*.55,p.size*.8]} rotation={[i*.4,i,.2]} castShadow receiveShadow><meshStandardMaterial color={i%2?'#89898a':'#6e6f71'} roughness={1} bumpMap={grain} bumpScale={.04}/></mesh>)}
   <group ref={earth} rotation={[.1,-.6,.18]}><mesh><sphereGeometry args={[2.7,64,48]}/><meshStandardMaterial map={earthMap} roughness={1}/></mesh><mesh><sphereGeometry args={[2.73,64,48]}/><meshStandardMaterial map={clouds} transparent opacity={.55} depthWrite={false}/></mesh><mesh><sphereGeometry args={[2.79,48,32]}/><meshBasicMaterial color="#5c9bc9" transparent opacity={.065} side={THREE.BackSide} depthWrite={false}/></mesh></group>
   <group ref={dust} visible={false}>{Array.from({length:18},(_,i)=>{const a=i*2.399,r=1+(i%6)*.7;return <mesh key={i} position={[Math.cos(a)*r,.02+i%3*.025,Math.sin(a)*r]} rotation={[-Math.PI/2,0,0]} scale={[1.4,.6,1]}><circleGeometry args={[.8+i%4*.2,16]}/><meshBasicMaterial color="#b0aba0" transparent opacity={0} depthWrite={false}/></mesh>;})}</group>
  </group>
  <group ref={craft}><LunarLander flight={flight} build={build}/></group>
  <group ref={separatedService} visible={false}><mesh><cylinderGeometry args={[.7,.7,3,32]}/><meshStandardMaterial color="#cdd4d1" metalness={.6} roughness={.4}/></mesh><mesh position={[0,-1.8,0]}><cylinderGeometry args={[.25,.5,.6,24,1,true]}/><meshStandardMaterial color="#464d50" side={THREE.DoubleSide}/></mesh></group>
  <LunarSurfaceWorld flight={flight} elevation={lunarElevation} onNavigate={onNavigate}/>

 </>;
}

export default function LunarVisuals(props){
 const phase=props.flight.current.phase;
 return ['briefing','launch','parking','transfer','arrival'].includes(phase)?<LunarJourney {...props}/>:<LunarSurfaceScene {...props}/>;
}
