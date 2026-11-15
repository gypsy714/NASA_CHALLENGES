# Multiplayer setup

## Same Wi-Fi

1. Install dependencies, then run `npm.cmd run dev:crew` on one laptop.
2. Use the Network address printed by Vite on every laptop, including the host.
3. Create a room. Share the six-character code. Joiners choose an unused role.
4. The commander enters headquarters, builds and starts a mission.

Localhost and 127.0.0.1 refer to the laptop using the address. Other laptops
must use the host's Network address. If Windows asks about network access,
the laptop owner must review it. School or guest Wi-Fi may block device access.

## Different networks

A public Node web service is required. Put this project in a Git repository,
then use a Node hosting provider with a long-running web service:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Node: 22 or newer
- Port: the provider's PORT environment variable
- Deploy one server instance. Rooms are stored in memory.

The included render.yaml describes this service for Render. Review the hosting
provider's current plan and terms before deploying. No account or public service
has been created for you. Share the HTTPS service address and room code.

Static-only hosts cannot run the room API. A sleeping service may need time to
wake up. Restarting or redeploying closes active rooms. This version has no
accounts, matchmaking, persistent rooms or shared remote 3D rendering.

## Roles

- Commander: chooses and builds the mission, operates the 3D scene and drives.
- Flight controller: throttle, pitch, transfer corrections and landing stages.
- Engineer: solar power, legs, rover deployment, antenna and landing guidance.
- Scientist: camera, scans, samples, seismic equipment and science transmission.

Commands use the same mission safety checks as local controls. A sent command
can still be rejected because a stage, power, distance or hardware condition is
not satisfied. Read the live mission message. Remote commands do not bypass gates.

The commander must keep the game tab active. The simulation runs on that laptop.
Disconnecting shows a reconnecting notice. A disconnected role is released after
60 seconds. Closing the commander room ends it for everyone. Four roles maximum.
Treat room codes as invitations. This is an educational prototype, not a hardened
public matchmaking service. Keep it to your team or supervised demonstrations.

Flight records save locally on each connected browser when it receives a result.
Photos stay with the commander and are not uploaded to the crew server.

Hosting reference: https://render.com/docs/web-services and https://render.com/docs/deploy-node-express-app
