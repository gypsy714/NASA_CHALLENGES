/**
 * AI assistance: Codex helped implement and test this educational mission model.
 * It uses simplified dynamics, not flight-qualified navigation or landing software.
 * NASA sources and the scope of assistance are documented in AI_USAGE.md.
 */
export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
import { DEFAULT_MARS_CONFIGURATION, payloadStats } from './marsConfiguration.js';
export const terrainHeight = (x, z) => .16 * Math.sin(x * .24) * Math.cos(z * .2)
  + .08 * Math.sin(x * .7 + z * .3);
export const scienceSites = [
  { id: 'scan', name: 'Layered outcrop', x: -9, z: -12, radius: 1.5,
    description: 'Scan the layers for a simulated mineral spectrum.' },
  { id: 'sample', name: 'Basalt specimen', x: 10, z: -18, radius: .8,
    description: 'Use the arm to collect and cache a rock sample.' },
];
export const rocks = Array.from({ length: 64 }, (_, i) => {
  const a = i * 2.39996, r = 18 + (i * 17 % 87);
  return { x: Math.sin(a) * r, z: Math.cos(a) * r, radius: .4 + (i * 7 % 13) * .13 };
}).concat(scienceSites);
const event = (s, message) => { s.message = message; };
export function createMarsMission(configuration=DEFAULT_MARS_CONFIGURATION) {
  const payload=payloadStats(configuration);
  return {
    configuration:{...configuration},dryMass:payload.dryMass,maxThrust:payload.thrust*1000,
    phase: 'transfer', time: 0, days: 0, warp: 1, serviceFuel: payload.transferFuel,
    burn: 0, correction: 0, error: 18, altitude: 125000, vertical: -1250,
    horizontal: 5200, fuel: payload.fuel, throttle: 0, guidance: true, bank: 0,
    chute: false, powered: false, heat: 0, q: 0, shake: 0,
    rover: { x: 0, z: 3, heading: 0, speed: 0, battery: payload.battery, capacity:payload.battery, wheel: 0 },
    deployed: false, deployment: 0, camera: 0, photo: null, scan: false,
    sample: false, task: null, taskTime: 0, antenna: false, transmission: 0,
    message: 'Parking orbit achieved. Start the Mars injection burn.', failure: '',
  };
}
export function commandMars(s, action, value) {
  if (s.phase === 'failed' || s.phase === 'success') return false;
  if (action === 'burn' && s.phase === 'transfer' && s.burn === 0) {
    s.burn = .01; event(s, 'Injection burn active. Service-stage fuel is separate from landing propellant.');
  } else if (action === 'correct' && ['cruise', 'arrival'].includes(s.phase)) {
    if (s.serviceFuel < 2) { event(s, 'Insufficient correction propellant.'); return false; }
    const direction = value || 1;
    s.error += direction * 2;
    s.serviceFuel -= 2;
    s.correction++;
    event(s, `Correction applied. Arrival corridor offset ${s.error.toFixed(1)} km.`);
  } else if (action === 'entry' && s.phase === 'arrival') {
    if (Math.abs(s.error) > 4 || !s.correction) {
      event(s, 'Correct the arrival offset to within ±4 km before entry.'); return false;
    }
    s.phase = 'separation'; s.separationTime = 0; s.warp = 1;
    event(s, 'Cruise stage releasing the rover entry capsule. The Earth booster does not land on Mars.');
  } else if (action === 'chute' && s.phase === 'entry') {
    if (!canDeployChute(s)) { event(s, 'Wait for altitude 3–13 km and speed below 550 m/s.'); return false; }
    s.chute = true; s.phase = 'parachute'; s.warp = 1;
    event(s, 'Parachute deployed. It cannot land this heavy vehicle alone. Start powered descent below 2.5 km.');
  } else if (action === 'powered' && s.phase === 'parachute') {
    if (!(s.configuration?.engine>0)) {event(s,'No landing engine cluster installed.');return false;}
    if (s.altitude > 2500) { event(s, 'Wait until below 2.5 km before powered descent.'); return false; }
    s.phase = 'descent'; s.chute = false; s.powered = true; s.warp = 1;
    event(s, 'Backshell and parachute released. Landing thrusters active. Guidance can be switched off.');
  } else if (action === 'deploy' && s.phase === 'landed' && !s.deployed) {
    s.deployed = true; event(s, 'Ramp open. Rover unfolding. Drive with the on-screen pad or WASD.');
  } else if (action === 'photo' && s.phase === 'landed' && s.deployed && value) {
    if(!s.configuration?.camera)return false;
    s.photo = value; event(s, 'Landscape image saved. Photograph is from this simulated scene.');
  } else if ((action === 'scan' || action === 'sample') && s.phase === 'landed' && s.deployment >= 1) {
    if(!(s.configuration?.[action==='scan'?'scanner':'arm']>0))return false;
    const target = scienceSites.find(site => site.id === action);
    if (Math.hypot(s.rover.x - target.x, s.rover.z - target.z) > 3.6) {
      event(s, `Drive within 3.6 m of ${target.name}. Collection never moves the rover automatically.`); return false;
    }
    if (Math.abs(s.rover.speed) > .1 || s.rover.battery < 3 || s[action] || s.task) {
      event(s, 'Brake and stop beside the target. Check battery and completed tasks.'); return false;
    }
    s.task = action; s.taskTime = 0;
    event(s, action === 'scan' ? 'Spectrometer scanning the visible outcrop…' : 'Robotic arm collecting the visible basalt specimen…');
  } else if (action === 'antenna' && s.phase === 'landed' && s.deployed) {
    if(!s.configuration?.antenna)return false;
    s.antenna = !s.antenna; event(s, s.antenna ? 'High-gain antenna deployed. Park near the marked relay point.' : 'Antenna stowed.');
  } else if (action === 'transmit' && s.phase === 'landed') {
    if (!s.photo || !s.scan || !s.sample || !s.antenna || !communicationReady(s) || s.rover.battery < 4) {
      event(s, 'Complete all three objectives, deploy the antenna, and stop within 7 m of RELAY.'); return false;
    }
    s.phase = 'transmitting'; event(s, 'Sending photograph, spectrum and sample analysis. The physical sample stays on Mars.');
  } else return false;
  return true;
}
export const canDeployChute = s => s.configuration?.chute>0 && s.altitude <= 13000 && s.altitude >= 3000
  && Math.hypot(s.vertical, s.horizontal) <= 550;
export const communicationReady = s => Math.hypot(s.rover.x, s.rover.z - 12) < 7
  && Math.abs(s.rover.speed) < .1;
export function stepMars(s, dt, input = {}) {
  if (['failed', 'success'].includes(s.phase)) return;
  s.time += dt;
  if (s.phase === 'separation') {
    s.separationTime += dt;
    if (s.separationTime >= 10) {
      s.phase = 'entry';
      event(s, 'Entry capsule clear of the cruise stage. Heat shield forward. Watch the parachute window.');
    }
  }
  if (s.phase === 'transfer' && s.burn > 0) {
    const used = Math.min(s.serviceFuel, dt * 8);
    s.serviceFuel -= used; s.burn += used / 280;
    if (s.burn >= 1) { s.phase = 'cruise'; s.warp = 1; event(s, 'Injection complete. Time warp advances the 210-day journey. Correct the corridor with the − / + burn buttons.'); }
    else if(s.serviceFuel<=0){s.phase='failed';s.failure='Transfer reserve exhausted before injection completed. Install at least two transfer reserve tanks.';}
  }
  if (s.phase === 'cruise') {
    s.days = Math.min(210, s.days + dt * s.warp);
    if (s.days >= 210) { s.phase = 'arrival'; s.warp = 1; event(s, 'Mars approach. Set arrival offset within ±4 km, then commit to entry.'); }
  }
  if (['entry', 'parachute', 'descent'].includes(s.phase)) {
    if ((s.phase === 'entry' && s.altitude < 14500) || (s.phase === 'parachute' && s.altitude < 3000) || (s.phase === 'descent' && s.altitude < 200)) s.warp = 1;
    const speed = Math.max(1, Math.hypot(s.vertical, s.horizontal));
    const rho = .020 * Math.exp(-Math.max(0, s.altitude) / 11100);
    const mass = (s.dryMass||1300) + s.fuel;
    const maxThrust=s.maxThrust??22000;
    s.q = .5 * rho * speed * speed;
    const drag = s.q * (s.chute ? 200 : 28) / mass;
    let ax = -drag * s.horizontal / speed;
    let ay = -3.71 + s.horizontal * s.horizontal / (3389500 + s.altitude)
      - drag * s.vertical / speed;
    s.heat = clamp(Math.sqrt(rho / .02) * Math.pow(speed / 5300, 3) * 150, 0, 100);
    s.shake = Math.min(.035, s.q / 1000000 + s.heat * .0002);
    if (s.phase === 'entry') {
      // Small bank-controlled lift changes the entry path; drag still removes energy.
      ay += drag * .15 * Math.cos(s.bank * Math.PI / 180);
    }
    if (s.powered && s.fuel > 0) {
      let fx, fy;
      if (s.guidance) {
        const targetV = -clamp(s.altitude * .06, 1.2, 48);
        fx = -s.horizontal * .7 * mass;
        fy = (3.71 + (targetV - s.vertical) * .9) * mass;
        const factor = Math.min(1, maxThrust / Math.max(1, Math.hypot(fx, fy)));
        fx *= factor; fy = Math.max(0, fy * factor);
        s.throttle = Math.hypot(fx, fy) / maxThrust * 100;
      } else {
        const a = s.bank * Math.PI / 180;
        fx = Math.sin(a) * maxThrust * s.throttle / 100;
        fy = Math.cos(a) * maxThrust * s.throttle / 100;
      }
      const required = Math.hypot(fx, fy) / (225 * 9.81) * dt;
      const available = Math.min(1, s.fuel / Math.max(required, 1e-9));
      s.fuel = Math.max(0, s.fuel - required);
      ax += fx / mass * available; ay += fy / mass * available;
      s.shake = Math.max(s.shake, s.throttle * .00012);
    }
    s.horizontal += ax * dt; s.vertical += ay * dt;
    s.altitude += s.vertical * dt;
    if (s.altitude <= 0) {
      s.altitude = 0; s.shake = 0;
      if (Math.abs(s.vertical) <= 3 && Math.abs(s.horizontal) <= 2 && s.powered && s.configuration?.legs>0 && (s.guidance || Math.abs(s.bank) <= 10)) {
        s.phase = 'landed'; s.vertical = 0; s.horizontal = 0; s.throttle = 0;
        event(s, 'Soft touchdown confirmed. Deploy the rover to begin surface science.');
      } else { s.phase = 'failed'; s.failure = `Impact: ${Math.abs(s.vertical).toFixed(1)} m/s vertical, ${Math.abs(s.horizontal).toFixed(1)} m/s lateral. Use parachute AND landing thrusters.`; }
    }
  }
  if (s.phase === 'landed') {
    s.deployment = clamp(s.deployment + (s.deployed ? dt / 3 : 0), 0, 1);
    const r = s.rover;
    const stopped = s.task || s.deployment < 1 || r.battery <= .1 || !s.configuration?.mobility;
    const forward = stopped ? 0 : clamp(input.forward || 0, -1, 1);
    const steering = stopped ? 0 : clamp(input.steer || 0, -1, 1);
    const brake = stopped || input.brake;
    r.speed += (forward * 1.7 - r.speed * (brake ? 9 : 1.2)) * dt;
    if (Math.abs(r.speed) < .01) r.speed = 0;
    r.heading += steering * dt * Math.min(1.3, Math.abs(r.speed) + .4);
    const x = r.x + Math.sin(r.heading) * r.speed * dt;
    const z = r.z - Math.cos(r.heading) * r.speed * dt;
    const hit = rocks.some(rock => Math.hypot(x - rock.x, z - rock.z) < rock.radius + 1.0);
    if (!hit && Math.hypot(x, z) < 112) { r.x = x; r.z = z; }
    else { r.speed = 0; if (forward) event(s, 'Obstacle ahead. Reverse and steer around the rock.'); }
    r.wheel += r.speed * dt / .38;
    // Stationary solar charging gives a recoverable battery, rather than a dead save.
    r.battery = clamp(r.battery + (Math.abs(r.speed) > .01 ? -.055 * Math.abs(r.speed) : s.configuration?.power ? .025 : 0) * dt, 0, r.capacity||100);
    if (s.task) {
      s.taskTime += dt;
      if (s.taskTime >= 5) {
        s[s.task] = true; r.battery = Math.max(0, r.battery - 2);
        event(s, s.task === 'scan' ? 'Spectrum recorded: simulated iron-bearing minerals. This is training data.' : 'Basalt sample cached. Simulated composition analysis saved.');
        s.task = null;
      }
    }
  }
  if (s.phase === 'transmitting') {
    s.transmission = Math.min(1, s.transmission + dt / 8);
    s.rover.battery = Math.max(0, s.rover.battery - dt * .2);
    if (s.transmission >= 1) { s.phase = 'success'; event(s, 'Earth received all three science records. Mission success!'); }
  }
}
