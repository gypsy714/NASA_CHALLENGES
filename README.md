# Beyond Earth

A space mission game by Always Online, built with React, Three.js and Vite.

## Run

powershell
npm.cmd install
npm.cmd run dev


Open the address shown in the terminal.

## Play

Choose Single Player, enter headquarters, walk to the console and press E.
Select Earth, Moon or Mars, assemble your vehicle and follow the mission panel.
Rover controls and science instructions appear during play.

Completed and failed flights save in Mission Records on the same browser.
You can filter and export the records. Earlier flights are not added retroactively.

## Multiplayer

Choose Multiplayer. Create a room as commander, or enter a code and choose
flight controller, engineer or scientist. Up to four players share one mission.
The commander runs the 3D scene and drives the rover. Other players operate
remote consoles with live telemetry and commands.

For laptops on the same Wi-Fi, run `npm.cmd run dev:crew` and open the host's
Network address on each laptop. Keep the host laptop and server running.

For different networks, deploy the included Node server. Everyone opens the
same public address. See [MULTIPLAYER.md](MULTIPLAYER.md). Static hosting alone
supports single player, but cannot run multiplayer rooms.

## Build

```powershell
npm.cmd run build
npm.cmd start
```

Open `http://localhost:3000`. The server serves the built game and crew rooms.

## Credits

NASA and other sources: [CREDITS.md](CREDITS.md).
This game uses simplified physics and simulated science results.
