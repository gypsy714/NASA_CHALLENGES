import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCrewService } from './crewServer.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
if(!existsSync(path.join(root,'index.html')))throw new Error('Build the game first: npm run build');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wasm':'application/wasm','.svg':'image/svg+xml','.txt':'text/plain'};
const crew=createCrewService();
const server=http.createServer((req,res)=>crew.handle(req,res,()=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  let file=path.resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!existsSync(file)||!statSync(file).isFile()){
    if(path.extname(pathname)){res.writeHead(404).end();return;}file=path.join(root,'index.html');
  }
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Length',statSync(file).size);
  if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
}));
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Mission Control ready on port ${server.address().port}. Rooms stay active while this server runs.`));
process.on('SIGTERM',()=>{crew.close();server.close();});
