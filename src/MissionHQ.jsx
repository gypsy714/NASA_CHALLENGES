import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, RoundedBox, Stars, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import './MissionHQ.css';
import SpacecraftAssembly from './SpacecraftAssembly';

const CONSOLE = new THREE.Vector3(0, 0, -4);
const LIMIT_X = 10.5;
const LIMIT_Z = 8.5;

function Player({ controlsEnabled, onInteract, onPositionChange }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const position = useRef(new THREE.Vector3(0, 1.7, 6));
  const callbacks = useRef({ onInteract, onPositionChange });
  const forwardVector = useRef(new THREE.Vector3());
  const sideVector = useRef(new THREE.Vector3());
  callbacks.current = { onInteract, onPositionChange };

  useEffect(() => {
    camera.position.copy(position.current);
    camera.rotation.order = 'YXZ';
    const down = (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key) &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
      }
      if (!controlsEnabled || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      keys.current[key] = true;
      if (key === 'e' && !event.repeat) callbacks.current.onInteract();
    };
    const up = (event) => { keys.current[event.key.toLowerCase()] = false; };
    const move = (event) => {
      if (!controlsEnabled || document.pointerLockElement !== gl.domElement) return;
      yaw.current -= event.movementX * 0.002;
      pitch.current = THREE.MathUtils.clamp(pitch.current - event.movementY * 0.002, -1.35, 1.35);
    };
    const blur = () => { keys.current = {}; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('mousemove', move);
    };
  }, [camera, gl, controlsEnabled]);

  useFrame((_, delta) => {
    onPositionChange(position.current.x, position.current.z);
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
    if (controlsEnabled) {
      const forward = Number(!!(keys.current.w || keys.current.arrowup)) - Number(!!(keys.current.s || keys.current.arrowdown));
      const sideways = Number(!!(keys.current.d || keys.current.arrowright)) - Number(!!(keys.current.a || keys.current.arrowleft));
      const length = Math.hypot(forward, sideways) || 1;
      const step = Math.min(delta, 0.05) * (keys.current.shift ? 6.5 : 3.6);
      forwardVector.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      sideVector.current.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      const dx = (forwardVector.current.x * forward + sideVector.current.x * sideways) * step / length;
      const dz = (forwardVector.current.z * forward + sideVector.current.z * sideways) * step / length;
      position.current.x = THREE.MathUtils.clamp(position.current.x + dx, -LIMIT_X, LIMIT_X);
      position.current.z = THREE.MathUtils.clamp(position.current.z + dz, -LIMIT_Z, LIMIT_Z);
      camera.position.copy(position.current);
    }
    
  });
  return null;
}

function Screen({ position, rotation = [0, 0, 0], width = 1.35, height = 0.78, label = 'FLIGHT TELEMETRY', accent = '#51b9ff' }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[width + 0.12, height + 0.13, 0.11]} radius={0.055} smoothness={3}>
        <meshStandardMaterial color="#111a25" metalness={0.7} roughness={0.25} />
      </RoundedBox>
      <mesh position={[0, 0, 0.064]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#061725" />
      </mesh>
      <Text position={[-width * 0.44, height * 0.33, 0.071]} fontSize={0.066} color={accent} anchorX="left">{label}</Text>
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[-width * 0.23, height * (0.13 - i * 0.11), 0.07]}>
          <planeGeometry args={[width * (0.46 + (i % 3) * 0.1), 0.015]} />
          <meshBasicMaterial color={i === 2 ? '#e9ae66' : accent} transparent opacity={0.4 + i * 0.06} />
        </mesh>
      ))}
      <mesh position={[width * 0.27, -height * 0.08, 0.071]}>
        <ringGeometry args={[height * 0.13, height * 0.16, 40]} />
        <meshBasicMaterial color={accent} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Workstation({ position, rotation = 0, main = false }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[3.1, 0.16, 1.5]} position={[0, 0.92, 0]} radius={0.07} smoothness={3}>
        <meshStandardMaterial color="#253544" metalness={0.65} roughness={0.38} />
      </RoundedBox>
      <mesh position={[0, 0.81, -0.57]}>
        <boxGeometry args={[2.9, 0.13, 0.1]} />
        <meshBasicMaterial color={main ? '#4ad5ff' : '#2b7ea9'} />
      </mesh>
      {[-1.35, 1.35].map(x => (
        <mesh key={x} position={[x, 0.47, 0]}>
          <boxGeometry args={[0.14, 0.85, 1.3]} />
          <meshStandardMaterial color="#15212e" metalness={0.6} />
        </mesh>
      ))}
      <Screen position={[-0.73, 1.72, -0.45]} rotation={[0, 0.17, 0]} label={main ? 'MISSION CONTROL' : 'SYSTEM STATUS'} />
      <Screen position={[0.73, 1.72, -0.45]} rotation={[0, -0.17, 0]} label={main ? 'ORBIT TRACKING' : 'TELEMETRY'} accent="#63d5c7" />
      <mesh position={[0, 1.04, 0.37]} rotation={[-0.13, 0, 0]}>
        <boxGeometry args={[1.18, 0.045, 0.32]} />
        <meshStandardMaterial color="#0b1520" metalness={0.4} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.47 + i * 0.117, 1.07, 0.33]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.075, 0.055]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#4cb8e6' : '#718b9e'} />
        </mesh>
      ))}
      <group position={[0, 0, 1.18]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.85, 0.15, 0.8]} />
          <meshStandardMaterial color="#182936" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.96, 0.28]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.85, 1.03, 0.14]} />
          <meshStandardMaterial color="#233848" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.42, 12]} />
          <meshStandardMaterial color="#1b2732" metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function RealisticEarth(props) {
  const earthRef = useRef();

  const earthTexture = useTexture('/textures/earth.jpg');

  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <mesh ref={earthRef} {...props}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={earthTexture}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

function WallDisplay() {
  return (
    <group position={[0, 3.55, -9.72]}>
      <mesh>
        <boxGeometry args={[15.7, 4.45, 0.16]} />
        <meshStandardMaterial color="#07111b" metalness={0.5} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.091]}>
        <planeGeometry args={[15.35, 4.13]} />
        <meshBasicMaterial color="#061c2e" />
      </mesh>
      <group position={[-3.1, 0.03, 0.13]}>
        <mesh>
          <RealisticEarth scale={1.5} />
        </mesh>
      </group>
      <Text position={[1.1, 1.56, 0.14]} fontSize={0.32} color="#d5efff" anchorX="left">EARTH ORBITAL OPERATIONS</Text>
      <Text position={[1.1, 1.1, 0.14]} fontSize={0.16} color="#65cfff" anchorX="left">MISSION 001  /  EARTH OBSERVER</Text>
      {['ORBITAL INSERTION     PENDING', 'SPACECRAFT HEALTH     NOMINAL', 'GROUND LINK              READY', 'MISSION STATUS        PRE-LAUNCH'].map((line, i) => (
        <Text key={line} position={[1.1, 0.44 - i * 0.47, 0.14]} fontSize={0.15} color={i === 0 ? '#f6bd7c' : '#a4d6e7'} anchorX="left">{line}</Text>
      ))}
      <mesh position={[0, -2.2, 0.09]}>
        <boxGeometry args={[15.8, 0.04, 0.12]} />
        <meshBasicMaterial color="#37b7ee" />
      </mesh>
    </group>
  );
}

function CircularConsole() {
  const { scene } = useGLTF('/models/mission_console.glb');

  return (
    <primitive
      object={scene}
      position={[0, 0, -4]}
      scale={1.4}
    />
  );
}

function Room() {
  const wallMat = '#19232d';
  const trimMat = '#303e49';
  const amber = '#f5b76b';
  const blue = '#61c5ee';

  return (
    <>
      <color attach="background" args={['#080d14']} />
      <fog attach="fog" args={['#0b131d', 19, 40]} />
      <hemisphereLight args={['#b7c7d5', '#111820', 0.75]} />
      <pointLight position={[0, 5.1, -4]} intensity={36} distance={19} color="#c4e6ff" />
      <pointLight position={[-8, 4.8, 3]} intensity={19} distance={14} color="#ffc48a" />
      <pointLight position={[8, 4.8, 3]} intensity={19} distance={14} color="#ffc48a" />
      <pointLight position={[0, 4.5, 6]} intensity={15} distance={13} color="#8fc9f1" />
      <ambientLight intensity={0.65} color="#b7d4ff" />
      <pointLight position={[0, 5, -2]} intensity={90} distance={18} decay={2} color="#dceaff"
/>
      {/* Polished dark floor with large inset tiles */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#202a32" metalness={0.48} roughness={0.48} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => -10 + i * 2).map(x => (
        <mesh key={'floor-x-' + x} position={[x, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.018, 20]} />
          <meshBasicMaterial color="#3c4b56" transparent opacity={0.48} />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => -8 + i * 2).map(z => (
        <mesh key={'floor-z-' + z} position={[0, 0.013, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[24, 0.018]} />
          <meshBasicMaterial color="#3c4b56" transparent opacity={0.48} />
        </mesh>
      ))}

      {/* Recessed centre aisle and guide lights */}
      <mesh position={[0, 0.025, 3.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.45, 9.4]} />
        <meshStandardMaterial color="#121d27" metalness={0.7} roughness={0.35} />
      </mesh>
      {[-1.7, 1.7].map(x => (
        <mesh key={'aisle-' + x} position={[x, 0.032, 3.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.035, 9.4]} />
          <meshBasicMaterial color={blue} />
        </mesh>
      ))}
      {[1.5, 3.5, 5.5, 7.5].map(z => (
        <mesh key={'mark-' + z} position={[0, 0.035, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.65, 0.055]} />
          <meshBasicMaterial color="#547f95" />
        </mesh>
      ))}

      {/* Structural walls and ceiling */}
      <mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#101820" side={THREE.DoubleSide} />
      </mesh>
      {[
        { p: [0, 3, -10], s: [24, 6, 0.3] },
        { p: [0, 3, 10], s: [24, 6, 0.3] },
        { p: [-12, 3, 0], s: [0.3, 6, 20] },
        { p: [12, 3, 0], s: [0.3, 6, 20] }
      ].map((wall, i) => (
        <mesh key={'wall-' + i} position={wall.p}>
          <boxGeometry args={wall.s} />
          <meshStandardMaterial color={wallMat} metalness={0.5} roughness={0.55} />
        </mesh>
      ))}

      {/* Ceiling acoustic panels, recessed light strips */}
      {[-8, -4, 0, 4, 8].map(x => (
        <group key={'ceiling-' + x}>
          <mesh position={[x, 5.91, 0]}>
            <boxGeometry args={[2.75, 0.13, 17.4]} />
            <meshStandardMaterial color="#1b2832" metalness={0.6} roughness={0.45} />
          </mesh>
          <mesh position={[x - 1.22, 5.83, 0]}>
            <boxGeometry args={[0.045, 0.025, 15.8]} />
            <meshBasicMaterial color="#b7d9ed" />
          </mesh>
          <mesh position={[x + 1.22, 5.83, 0]}>
            <boxGeometry args={[0.045, 0.025, 15.8]} />
            <meshBasicMaterial color="#b7d9ed" />
          </mesh>
        </group>
      ))}
      {[-6, 0, 6].map(z => (
        <mesh key={'crossbeam-' + z} position={[0, 5.75, z]}>
          <boxGeometry args={[24, 0.25, 0.26]} />
          <meshStandardMaterial color="#344550" metalness={0.65} />
        </mesh>
      ))}

      {/* Repeating wall panels, vertical accent lights and horizontal trim */}
      {[-1, 1].map(side => (
        <group key={'side-' + side}>
          {[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map(z => (
            <group key={z}>
              <mesh position={[side * 11.79, 3.15, z]}>
                <boxGeometry args={[0.12, 4.4, 2.7]} />
                <meshStandardMaterial color={z === 1.5 ? '#273947' : '#202e3a'} metalness={0.55} roughness={0.45} />
              </mesh>
              <mesh position={[side * 11.7, 3.1, z + 1.32]}>
                <boxGeometry args={[0.035, 4.1, 0.035]} />
                <meshBasicMaterial color={z === -1.5 ? amber : '#477e9d'} />
              </mesh>
              <mesh position={[side * 11.68, 4.3, z]}>
                <boxGeometry args={[0.04, 0.018, 1.7]} />
                <meshBasicMaterial color="#53748a" />
              </mesh>
            </group>
          ))}
          <mesh position={[side * 11.62, 0.55, 0]}>
            <boxGeometry args={[0.09, 0.12, 19]} />
            <meshStandardMaterial color={trimMat} metalness={0.7} />
          </mesh>
          <mesh position={[side * 11.61, 0.67, 0]}>
            <boxGeometry args={[0.03, 0.022, 18.8]} />
            <meshBasicMaterial color={blue} />
          </mesh>
        </group>
      ))}

      {/* Framed front wall display, with original mission data */}
      <mesh position={[0, 3.55, -9.85]}>
        <boxGeometry args={[17.2, 5.05, 0.2]} />
        <meshStandardMaterial color="#34434e" metalness={0.8} roughness={0.35} />
      </mesh>
      <WallDisplay />
      <mesh position={[0, 1.02, -9.6]}>
        <boxGeometry args={[17.4, 0.13, 0.18]} />
        <meshBasicMaterial color={blue} />
      </mesh>
      <Text position={[0, 5.43, -9.49]} fontSize={0.24} color="#d6e8f2" anchorX="center">
        MISSION CONTROL  /  FLIGHT OPERATIONS
      </Text>

      {/* Existing workstations and their functional centre location */}
      <CircularConsole />
      <Workstation position={[-4.4, 0, -4]} />
      <Workstation position={[4.4, 0, -4]} />
      <Workstation position={[-5.3, 0, 1.0]} rotation={-0.2} />
      <Workstation position={[5.3, 0, 1.0]} rotation={0.2} />

      {/* Raised equipment racks with ventilation slots and status lights */}
      {[-8.7, 8.7].map(x => (
        <group key={'rack-' + x} position={[x, 0, -7.1]}>
          <RoundedBox args={[1.65, 3.8, 1.35]} position={[0, 1.9, 0]} radius={0.09} smoothness={3}>
            <meshStandardMaterial color="#121d28" metalness={0.75} roughness={0.35} />
          </RoundedBox>
          {Array.from({ length: 8 }, (_, i) => (
            <group key={i}>
              <mesh position={[0, 0.55 + i * 0.38, 0.69]}>
                <boxGeometry args={[1.22, 0.19, 0.025]} />
                <meshStandardMaterial color="#263948" metalness={0.65} />
              </mesh>
              <mesh position={[0.43, 0.55 + i * 0.38, 0.713]}>
                <sphereGeometry args={[0.038, 10, 10]} />
                <meshBasicMaterial color={i % 3 === 0 ? amber : '#54dbba'} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Back-of-room mission identity wall, behind the player at spawn */}
      <mesh position={[0, 3.2, 9.75]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[8.2, 2.2]} />
        <meshBasicMaterial color="#142b3c" />
      </mesh>
      <Text position={[0, 3.5, 9.64]} rotation={[0, Math.PI, 0]} fontSize={0.4} color="#d9edf8" anchorX="center">
        BEYOND EARTH
      </Text>
      <Text position={[0, 2.95, 9.64]} rotation={[0, Math.PI, 0]} fontSize={0.16} color="#81b9d6" anchorX="center">
        EXPLORATION BEGINS HERE
      </Text>
    </>
  );
}


export default function MissionHQ({ onExit, audio }) {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState('earth');
  const [confirmedMission, setConfirmedMission] = useState(null);
  const [assemblyOpen, setAssemblyOpen] = useState(false);
  const [justClosed, setJustClosed] = useState(false);
  const canvasElement = useRef(null);
  const [nearComputer, setNearComputer] = useState(false);
  useEffect(() => { audio?.setScene(assemblyOpen ? 'assembly' : 'hq'); }, [assemblyOpen, audio?.setScene]);
  const nearComputerRef = useRef(false);
  const updatePlayerPosition = (x, z) => {
  const distance = Math.hypot(x, z + 4);
  const isNear = distance < 3.3;

  if (nearComputerRef.current !== isNear) {
    nearComputerRef.current = isNear;
    setNearComputer(isNear);}};

  const interact = useCallback(() => {
  if (!nearComputerRef.current) return;

  if (document.pointerLockElement) {
    document.exitPointerLock?.();
  }

  audio?.playEffect('terminal');
  setConsoleOpen(true);
  setJustClosed(false);
}, [audio]);

  const exitConsole = () => {
    audio?.playEffect('close');
    setConsoleOpen(false);
    setJustClosed(true);
  };

  useEffect(() => {
    const onCanvasClick = (event) => {
      if (event.target === canvasElement.current && !consoleOpen) {
        canvasElement.current.requestPointerLock?.();
      }
    };
    document.addEventListener('click', onCanvasClick);
    return () => document.removeEventListener('click', onCanvasClick);
  }, [consoleOpen]);

  useEffect(() => () => {
    if (document.pointerLockElement === canvasElement.current) document.exitPointerLock?.();
  }, []);

    if (assemblyOpen) {
  return (
    <SpacecraftAssembly
      mission={confirmedMission}
      onBack={() => { audio?.playEffect('close'); setAssemblyOpen(false); }}/>);}

  return (
    <div className="hq-screen">
      {!consoleOpen && <button style={{position:"fixed",top:14,right:18,zIndex:30,padding:"10px 16px",background:"#102b3d",color:"#caebfa",border:"1px solid #5a879c"}} onClick={onExit}>← MAIN MENU</button>}
      <Canvas camera={{ position: [0, 1.7, 6], fov: 73 }} onCreated={({ gl }) => { canvasElement.current = gl.domElement; }}>
        <Room />
        <Player controlsEnabled={!consoleOpen} onInteract={interact} onPositionChange={updatePlayerPosition}/>
      </Canvas>
      {!consoleOpen && (
  <div className="hq-prompt">
    {nearComputer ? (
      <>
        <span className="hq-prompt-key">E</span>
        <span>Press E to interact with Mission Control</span>
      </>
    ) : (
      <span>
        Walk towards the central Mission Control workstation to begin
      </span>
    )}
  </div>
)}
      {consoleOpen && (
        <div className="hq-console-overlay">
          <section className="hq-console" aria-label="Mission control terminal">
            <div className="hq-console-label">TERMINAL 01 / MISSION PLANNING</div>
            <h2>MISSION PLANNING</h2>
            <p>Select your mission, Commander.</p>

            <div className="mission-options">
            <button
                className={selectedMission === 'earth' ? 'selected' : ''}
                onClick={() => { audio?.playEffect('select'); setSelectedMission('earth'); }}
            >
                🌍 Earth Observation
            </button>

            <button
                className={selectedMission === 'moon' ? 'selected' : ''}
                onClick={() => { audio?.playEffect('select'); setSelectedMission('moon'); }}
            >
                🌙 Lunar Exploration
            </button>

            <button
                className={selectedMission === 'mars' ? 'selected' : ''}
                onClick={() => { audio?.playEffect('select'); setSelectedMission('mars'); }}
            >
                🔴 Mars Exploration
            </button>
            </div>
            <div className="hq-console-data">
            <div>
                <span>MISSION OBJECTIVE</span>
                <strong>
                {selectedMission === 'earth'
                    ? 'EARTH OBSERVATION'
                    : selectedMission === 'moon'
                    ? 'LUNAR EXPLORATION'
                    : 'MARS EXPLORATION'}
                </strong>
            </div>

            <div>
                <span>DESTINATION</span>
                <strong>
                {selectedMission === 'earth'
                    ? 'EARTH ORBIT'
                    : selectedMission === 'moon'
                    ? 'MOON'
                    : 'MARS'}
                </strong>
            </div>

            <div>
                <span>MISSION PHASE</span>
                <strong>PRE-LAUNCH</strong>
            </div>

            <div>
                <span>SPACECRAFT</span>
                <strong>NOT YET ASSEMBLED</strong>
            </div>
            </div>
            <button
            onClick={() => { audio?.playEffect('confirm'); setConfirmedMission(selectedMission); }}
            >
            CONFIRM MISSION
            </button>

            {confirmedMission === selectedMission && (
            <div className="mission-confirmed">
                <p>✓ MISSION CONFIRMED: {confirmedMission.toUpperCase()}</p>

                <button onClick={() => { audio?.playEffect('assembly'); setAssemblyOpen(true); }}>
                PROCEED TO SPACECRAFT ASSEMBLY →
                </button>
            </div>
            )}
            <button onClick={exitConsole}>CLOSE TERMINAL / RETURN TO ROOM</button>
          </section>
        </div>
      )}
    </div>
  );
}
