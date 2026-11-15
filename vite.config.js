import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createCrewService } from './crewServer.mjs';
export default defineConfig({
  plugins: [react(), {
    name: 'mission-crew-rooms',
    configureServer(server) {
      const crew=createCrewService();
      server.middlewares.use((req,res,next)=>crew.handle(req,res,next));
      server.httpServer?.once('close',()=>crew.close());
    },
  }],
});
