import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {atmosphereAt,visualHeight,visualDownrange} from './earthVisualState.js';

const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
const coast=z=>-205+Math.sin(z*.006)*48+Math.sin(z*.018)*14;
function texture(kind){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
 const data=ctx.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const n=hash(x,y),patch=Math.sin(x*.031)*Math.cos(y*.023)*10+Math.sin(x*.085+y*.059)*5,grain=(n-.5)*25+(kind==='grass'?patch:0),b=kind==='concrete'?155:kind==='road'?57:89;
  const i=(y*512+x)*4;data.data[i]=b+grain;data.data[i+1]=b+grain+(kind==='grass'?12:0);data.data[i+2]=b+grain-(kind==='grass'?24:0);data.data[i+3]=255;
 }
 ctx.putImageData(data,0,0);
 if(kind==='concrete'){ctx.strokeStyle='#767b7850';ctx.lineWidth=2;for(let i=0;i<=512;i+=128){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,512);ctx.moveTo(0,i);ctx.lineTo(512,i);ctx.stroke();}}
 if(kind==='road'){ctx.fillStyle='#d3cbb0';ctx.fillRect(253,0,5,512);}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(kind==='concrete'?6:kind==='road'?1:100,kind==='road'?20:kind==='concrete'?6:100);t.anisotropy=8;return t;
}
function Beam({a,b,width=.1,color='#afb7b5'}){
 const setup=useMemo(()=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);return {p:start.clone().add(end).multiplyScalar(.5),q:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()),length:d.length()};},[a,b]);
 return <mesh position={setup.p} quaternion={setup.q} castShadow><cylinderGeometry args={[width,width,setup.length,6]}/><meshStandardMaterial color={color} metalness={.65} roughness={.43}/></mesh>;
}
function Sea(){
 const shader=useRef();
 useFrame(({clock,scene})=>{if(shader.current){const u=shader.current.uniforms;u.time.value=clock.elapsedTime;if(scene.fog){u.fogNear.value=scene.fog.near;u.fogFar.value=scene.fog.far;u.fogTint.value.copy(scene.fog.color);}}});
 const uniforms=useMemo(()=>({time:{value:0},layerOpacity:{value:1},fogNear:{value:210},fogFar:{value:1500},fogTint:{value:new THREE.Color('#8fc0dc')}}),[]);
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.58,0]}><planeGeometry args={[14000,14000]}/><shaderMaterial ref={shader} uniforms={uniforms} vertexShader={`varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`} fragmentShader={`uniform float time;uniform float layerOpacity;uniform float fogNear;uniform float fogFar;uniform vec3 fogTint;varying vec3 world;void main(){float u=world.x*.16+time*.6,v=world.z*.23-time*.35;vec3 n=normalize(vec3(.10*cos(u)+.04*cos(v+u),1.,.09*cos(v)));vec3 view=normalize(cameraPosition-world),sun=normalize(vec3(.6,.8,.5));float fres=pow(1.-max(dot(view,n),0.),4.);float sparkle=pow(max(dot(reflect(-sun,n),view),0.),95.);vec3 sea=mix(vec3(.035,.19,.24),vec3(.36,.55,.64),fres);sea+=sparkle*.8;sea=mix(sea,fogTint,smoothstep(fogNear,fogFar,length(cameraPosition-world)));gl_FragColor=vec4(sea,layerOpacity);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')}/></mesh>;
}
function CoastalTerrain(){
 const map=useMemo(()=>{const t=new THREE.TextureLoader().load('/coastal-grass.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1000,1000);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;},[]);
 const geometry=useMemo(()=>{const g=new THREE.PlaneGeometry(10000,10000,300,300);g.rotateX(-Math.PI/2);const p=g.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),edge=x-coast(z),hill=Math.max(0,Math.min(1,(Math.hypot(x,z)-150)/200));p.setY(i,edge<0?-.95:-.34+hill*(Math.sin(x*.013)*Math.cos(z*.011)*1.5+1.5));const sand=edge<27;const shade=.73+hash(Math.floor(x/65),Math.floor(z/65))*.27;colors.push((sand?1:.87)*shade,(sand?.9:.91)*shade,(sand?.68:.67)*shade);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
 },[]);
 useEffect(()=>()=>{geometry.dispose();map.dispose();},[geometry,map]);
 return <><Sea/><mesh geometry={geometry} receiveShadow><meshStandardMaterial map={map} vertexColors roughness={1}/></mesh></>;
}
function Vegetation(){
 const trunks=useRef(),leaves=useRef();
 useEffect(()=>{const dummy=new THREE.Object3D();let j=0;for(let i=0;i<100;i++){const a=i*2.399,r=145+hash(i,1)*600,x=Math.cos(a)*r,z=Math.sin(a)*r;if(x<coast(z)+35)continue;const h=3+hash(i,2)*3;dummy.position.set(x,h/2-.2,z);dummy.scale.set(.25,h,.25);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.current.setMatrixAt(j,dummy.matrix);dummy.position.y=h;dummy.scale.set(3.2,1.1,3.2);dummy.rotation.y=a;dummy.updateMatrix();leaves.current.setMatrixAt(j,dummy.matrix);j++;}trunks.current.count=leaves.current.count=j;trunks.current.instanceMatrix.needsUpdate=leaves.current.instanceMatrix.needsUpdate=true;},[]);
 return <><instancedMesh ref={trunks} args={[null,null,100]} castShadow><cylinderGeometry args={[.65,1,1,5]}/><meshStandardMaterial color="#645c43" roughness={1}/></instancedMesh><instancedMesh ref={leaves} args={[null,null,100]} castShadow><sphereGeometry args={[1,7,4]}/><meshStandardMaterial color="#435c32" roughness={1}/></instancedMesh></>;
}
export function CoastalLaunchSite({rocketHeight=8,flightRef}){
 const concrete=useMemo(()=>texture('concrete'),[]),road=useMemo(()=>texture('road'),[]),arms=useRef();
 const h=Math.max(10,rocketHeight+3);
 useEffect(()=>()=>{concrete.dispose();road.dispose();},[concrete,road]);
 useFrame((_,dt)=>{if(arms.current){const f=flightRef.current,retract=f.phase==='flight'||f.altitude>0;arms.current.rotation.y=THREE.MathUtils.damp(arms.current.rotation.y,retract?-.9:0,1.6,dt);}});
 return <>
  <CoastalTerrain/><Vegetation/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.22,0]} receiveShadow><planeGeometry args={[58,65]}/><meshStandardMaterial map={concrete} roughness={.96}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[44,-.2,80]} receiveShadow><planeGeometry args={[9,300]}/><meshStandardMaterial map={road} roughness={.94}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[21,-.19,18]} receiveShadow><planeGeometry args={[40,7]}/><meshStandardMaterial color="#585d59" roughness={1}/></mesh>
  <mesh position={[0,.05,5]} receiveShadow><boxGeometry args={[5,.55,24]}/><meshStandardMaterial color="#353a3b" roughness={.9}/></mesh>
  {[-1,1].map(side=><mesh key={side} position={[side*3,.1,5]} castShadow receiveShadow><boxGeometry args={[1,.8,24]}/><meshStandardMaterial color="#9a9b90" map={concrete}/></mesh>)}
  <mesh position={[0,.6,0]} castShadow receiveShadow><cylinderGeometry args={[3.8,4.4,.9,48]}/><meshStandardMaterial color="#707b7e" metalness={.48} roughness={.6}/></mesh>
  <mesh position={[0,1.08,0]} receiveShadow><cylinderGeometry args={[2.4,2.4,.12,48]}/><meshStandardMaterial color="#282d2f" metalness={.6} roughness={.4}/></mesh>
  {[-1,1].flatMap(side=>Array.from({length:14},(_,i)=><mesh key={`${side}-${i}`} position={[side*5,-.18,-6+i*1.7]} rotation={[-Math.PI/2,0,side*.65]}><planeGeometry args={[.45,1.8]}/><meshStandardMaterial color="#bba54d" roughness={1}/></mesh>))}
  {[0,1].map(i=><group key={i} position={[8+i*1.3,.05,-12]}><mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.15,.15,26,12]}/><meshStandardMaterial color="#969d9a" metalness={.65} roughness={.4}/></mesh>{[-8,0,8].map(z=><mesh key={z} position={[0,-.05,z]}><boxGeometry args={[.65,.4,.5]}/><meshStandardMaterial color="#a4a79c" roughness={.8}/></mesh>)}</group>)}
  <group position={[-5.8,0,-2.2]}>
   {[-1,1].flatMap(i=>[-1,1].map(j=><mesh key={`${i}-${j}`} position={[i*.95,h/2,j*.95]} castShadow><boxGeometry args={[.19,h,.19]}/><meshStandardMaterial color="#a6adaa" metalness={.7} roughness={.4}/></mesh>))}
   {Array.from({length:9},(_,i)=>{const y=i*h/8;return <group key={i}><mesh position={[0,y,0]} castShadow><boxGeometry args={[2.25,.12,2.25]}/><meshStandardMaterial color="#68797c" metalness={.6}/></mesh><Beam a={[-.9,y,-.98]} b={[.9,y+h/8,-.98]} width={.045}/><Beam a={[-.98,y,.9]} b={[-.98,y+h/8,-.9]} width={.045}/></group>;})}
   <group ref={arms}>{[.3,.6,.87].map(n=><group key={n} position={[2.3,h*n,0]}><mesh castShadow><boxGeometry args={[4.6,.15,.7]}/><meshStandardMaterial color="#d3d2c8" metalness={.5}/></mesh><Beam a={[-2,0,0]} b={[1,.8,0]} width={.05} color="#b6c0bd"/></group>)}</group>
   <Beam a={[0,h,0]} b={[0,h+3.4,0]} width={.06}/>
  </group>
  {[[-23,-18],[25,-22],[-25,22]].map(([x,z],i)=><group key={i} position={[x,0,z]}><Beam a={[0,0,0]} b={[0,24,0]} width={.12}/><Beam a={[0,24,0]} b={[0,28,0]} width={.035}/><Beam a={[0,20,0]} b={[-5,0,-5]} width={.035}/></group>)}
  <group position={[21,0,-35]}><mesh position={[0,7,0]} castShadow><cylinderGeometry args={[.35,.5,14,12]}/><meshStandardMaterial color="#c2c7c2" metalness={.5}/></mesh><mesh position={[0,14,0]} castShadow><sphereGeometry args={[3.4,32,20]}/><meshStandardMaterial color="#e7e9df" metalness={.35} roughness={.48}/></mesh><Beam a={[-2,0,0]} b={[-1,12,0]}/><Beam a={[2,0,0]} b={[1,12,0]}/></group>
  {[0,1,2].map(i=><group key={i} position={[45+i*8,0,-45]}><mesh position={[0,3.7,0]} castShadow><cylinderGeometry args={[2.4,2.4,7.4,32]}/><meshStandardMaterial color="#d9ddd4" metalness={.4} roughness={.5}/></mesh><mesh position={[0,7.4,0]} castShadow><sphereGeometry args={[2.4,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#d3d8d3" metalness={.5} roughness={.4}/></mesh><Beam a={[-2.5,.8,0]} b={[-5,.8,0]} width={.18}/></group>)}
  {[0,1].map(i=><group key={i} position={[75+i*38,0,-100-i*35]}><mesh position={[0,6,0]} castShadow receiveShadow><boxGeometry args={[26,12,32]}/><meshStandardMaterial color="#c7cbc4" roughness={.8}/></mesh><mesh position={[0,12.3,0]} castShadow><boxGeometry args={[27,.6,33]}/><meshStandardMaterial color="#7a898c" metalness={.4}/></mesh><mesh position={[0,4.7,16.1]}><planeGeometry args={[18,9]}/><meshStandardMaterial color="#647074" roughness={.6}/></mesh>{Array.from({length:8},(_,j)=><mesh key={j} position={[-9+j*2.6,5,16.16]}><boxGeometry args={[.06,9,.025]}/><meshStandardMaterial color="#8e9999"/></mesh>)}</group>)}
  {[0,1,2,3,4].map(i=><group key={i} position={[32,0,20+i*24]}><Beam a={[0,0,0]} b={[0,7,0]} width={.055}/><mesh position={[0,7,.4]}><boxGeometry args={[.7,.15,.9]}/><meshStandardMaterial color="#d5d9d6" metalness={.6}/></mesh></group>)}
 </>;
}

export function EarthAtmosphere({radius=245}){
 return <mesh><sphereGeometry args={[radius,96,64]}/><shaderMaterial transparent depthWrite={false} side={THREE.BackSide} uniforms={{tint:{value:new THREE.Color('#49aaff')},layerOpacity:{value:1}}} vertexShader={`varying vec3 n;varying vec3 pos;void main(){vec4 p=modelMatrix*vec4(position,1.);pos=p.xyz;n=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}`} fragmentShader={`uniform vec3 tint;uniform float layerOpacity;varying vec3 n;varying vec3 pos;void main(){vec3 v=normalize(cameraPosition-pos);float rim=pow(1.-abs(dot(normalize(n),v)),3.3);float sun=.35+.65*max(dot(normalize(n),normalize(vec3(.5,.7,1.))),0.);gl_FragColor=vec4(tint,rim*.48*sun*layerOpacity);}`}/></mesh>;
}

export function FlightLighting({flightRef,visualRef}){
 const hemi=useRef(),ambient=useRef();const {gl,scene}=useThree();
 useEffect(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,128);g.addColorStop(0,'#9cc3e4');g.addColorStop(.48,'#d7e2e8');g.addColorStop(.53,'#888a7b');g.addColorStop(1,'#40483b');ctx.fillStyle=g;ctx.fillRect(0,0,256,128);const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(gl),env=pmrem.fromEquirectangular(t),old=scene.environment;scene.environment=env.texture;return()=>{scene.environment=old;env.dispose();pmrem.dispose();t.dispose();};},[gl,scene]);
 useFrame(()=>{const sky=THREE.MathUtils.smoothstep((visualRef?.current||flightRef.current).altitude,15000,85000);if(hemi.current)hemi.current.intensity=1.2-sky*1.05;if(ambient.current)ambient.current.intensity=.24-sky*.16;scene.environmentIntensity=.65-sky*.5;});
 return <><hemisphereLight ref={hemi} args={['#dceeff','#59624a',1.2]}/><ambientLight ref={ambient} intensity={.24}/><directionalLight castShadow position={[65,95,55]} intensity={3.1} color="#fff6e4" shadow-mapSize={[2048,2048]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-near={1} shadow-camera-far={220} shadow-bias={-.00015} shadow-normalBias={.04}/><WorldExhaust flightRef={flightRef} visualRef={visualRef}/></>;
}

function cloudTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,'rgba(255,255,255,.85)');g.addColorStop(.4,'rgba(245,248,250,.6)');g.addColorStop(1,'rgba(240,245,250,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
export function LaunchVapour({flightRef}){
 const group=useRef(),map=useMemo(cloudTexture,[]);useEffect(()=>()=>map.dispose(),[map]);
 useFrame(({clock})=>{const f=flightRef.current,t=clock.elapsedTime,firing=f.engine&&f.phase==='flight'&&f.altitude<450;if(!group.current)return;group.current.visible=firing||f.phase==='countdown'||f.phase==='ready';group.current.children.forEach((p,i)=>{const age=(t*(firing?.6:.18)+i/24)%1,a=i*2.399,spread=firing?4+age*13:.4+age*1.1;p.position.set(Math.cos(a)*spread+(firing?age*5:-.6),firing?.6+age*2.5:2.5+age*4,Math.sin(a)*spread);const size=firing?2+age*7:.5+age*1.4;p.scale.set(size,size*.65,1);p.material.opacity=(1-age)*(firing?.28:.07);});});
 return <group ref={group}>{Array.from({length:24},(_,i)=><sprite key={i}><spriteMaterial map={map} transparent opacity={.2} depthWrite={false}/></sprite>)}</group>;
}
export function SkyClouds(){
 const map=useMemo(cloudTexture,[]);useEffect(()=>()=>map.dispose(),[map]);
 const puffs=[...Array.from({length:25},(_,i)=>{const a=i*2.399,r=90+i*19;return {p:[Math.cos(a)*r,visualHeight(1800+i%5*900),Math.sin(a)*r],s:[45+i%4*8,13+i%3*3,1],a:.43};}),...Array.from({length:14},(_,i)=>({p:[Math.sin(i*2.399)*18,visualHeight(1800+i*340),Math.cos(i*2.399)*18],s:[32+i%3*8,13+i%2*4,1],a:.22}))];
 return <>{puffs.map((p,i)=><sprite key={i} position={p.p} scale={p.s}><spriteMaterial map={map} transparent opacity={p.a} depthWrite={false} color="#f7f9fc"/></sprite>)}</>;
}

export function RecoveryCanopy({flightRef,rocketHeight=8}){
 const root=useRef(),fabric=useRef();const r=Math.max(3.5,Math.min(7,rocketHeight*.6));
 useFrame(({clock},dt)=>{if(!root.current)return;const f=flightRef.current,open=f.parachute;root.current.visible=open;const s=THREE.MathUtils.damp(root.current.scale.x,open?1:.015,2.6,dt);root.current.scale.setScalar(s);if(fabric.current){fabric.current.rotation.z=Math.sin(clock.elapsedTime*.8)*.025;fabric.current.rotation.x=Math.sin(clock.elapsedTime*.65)*.02;}});
 return <group ref={root} visible={false} scale={.015}>
  <group ref={fabric} position={[0,rocketHeight+5,0]}>
   {Array.from({length:16},(_,i)=><mesh key={i} castShadow receiveShadow><sphereGeometry args={[r,8,14,i*Math.PI/8,Math.PI/8+.006,.14,Math.PI/2-.14]}/><meshStandardMaterial color={i%2?'#f2efe0':'#ce5f32'} side={THREE.DoubleSide} roughness={.95}/></mesh>)}
   {Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return <Beam key={i} a={[Math.sin(a)*r,0,Math.cos(a)*r]} b={[Math.sin(a)*.4,-5,Math.cos(a)*.4]} width={.018} color="#ccc6ac"/>;})}
   <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[r,.025,6,80]}/><meshStandardMaterial color="#e6ddc7" roughness={1}/></mesh>
  </group>
 </group>;
}

export function AltitudeStars({flightRef,visualRef}){
 const points=useRef();const geometry=useMemo(()=>{const g=new THREE.BufferGeometry(),p=[];for(let i=0;i<1600;i++){const u=hash(i,7)*Math.PI*2,z=hash(i,8)*2-1,r=Math.sqrt(1-z*z);p.push(Math.cos(u)*r*900,z*900,Math.sin(u)*r*900);}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));return g;},[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);useFrame(()=>{if(points.current)points.current.material.opacity=atmosphereAt((visualRef?.current||flightRef.current).altitude).stars*.85;});return <points ref={points} geometry={geometry}><pointsMaterial color="#e1eaff" size={1.3} transparent opacity={0} depthWrite={false} sizeAttenuation={false}/></points>;
}

export function FlightSky({flightRef,visualRef}){
 const root=useRef(),material=useRef();
 const uniforms=useMemo(()=>({darkness:{value:0},horizon:{value:new THREE.Color('#c3dbe5')},zenith:{value:new THREE.Color('#3d83ba')}}),[]);
 useFrame(({camera})=>{if(root.current)root.current.position.copy(camera.position);if(material.current)material.current.uniforms.darkness.value=Math.max(atmosphereAt((visualRef?.current||flightRef.current).altitude).darkness,visualRef?.current.remoteBlend||0);});
 return <mesh ref={root} renderOrder={-1000}><sphereGeometry args={[1400,32,24]}/><shaderMaterial ref={material} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} vertexShader={`varying vec3 dir;void main(){dir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`uniform float darkness;uniform vec3 horizon;uniform vec3 zenith;varying vec3 dir;void main(){vec3 d=normalize(dir);float height=pow(max(d.y,0.),.42);vec3 c=mix(horizon,zenith,height);float sun=pow(max(dot(d,normalize(vec3(.6,.8,.5))),0.),35.);c+=vec3(.28,.22,.13)*sun;gl_FragColor=vec4(mix(c,vec3(.0006,.0012,.0035),darkness),1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')}/></mesh>;
}

export function EngineExhaust(){
 const material=useRef();const uniforms=useMemo(()=>({time:{value:0}}),[]);
 useFrame(({clock})=>{if(material.current)material.current.uniforms.time.value=clock.elapsedTime;});
 return <group position={[0,-3.1,0]}>{[0,Math.PI/2].map((a,i)=><mesh key={i} rotation={[0,a,0]}><planeGeometry args={[2.2,6.6]}/><shaderMaterial ref={i===0?material:undefined} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} vertexShader={`varying vec2 tex;void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`uniform float time;varying vec2 tex;void main(){float y=tex.y;float width=.1+.55*pow(y,.7);float noise=sin(y*55.-time*43.)*.035+sin(y*103.+time*19.)*.018;float x=abs(tex.x-.5)*2.;float body=1.-smoothstep(width*.25,width+noise,x);float tail=smoothstep(0.,.23,y);float core=1.-smoothstep(.02,width*.4,x);vec3 color=mix(vec3(1.,.21,.025),vec3(1.,.85,.42),y);color=mix(color,vec3(.8,.92,1.),core*y);gl_FragColor=vec4(color,body*tail*.64);}`}/></mesh>)}</group>;
}

function WorldExhaust({flightRef,visualRef}){
 const root=useRef();
 useFrame(({clock})=>{const f=flightRef.current;if(!root.current)return;root.current.visible=f.engine&&f.fuel>0&&f.throttle>0&&f.phase==='flight';const v=visualRef?.current||f,y=visualHeight(v.altitude),x=visualDownrange(v.downrange);root.current.position.set(x,y+2.15,0);root.current.rotation.z=THREE.MathUtils.degToRad(90-f.pitch);const expansion=1+Math.min(f.altitude/70000,1)*.8;root.current.scale.set(expansion,.6+f.throttle/100*.6+Math.sin(clock.elapsedTime*36)*.03,expansion);});
 return <group ref={root} visible={false}><EngineExhaust/></group>;
}
