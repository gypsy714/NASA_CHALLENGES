import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import { ChevronLeft, Settings, Users, Rocket, BookOpen, Trophy, Volume2 } from 'lucide-react';
import * as THREE from 'three';
import './App.css';
import MissionHQ from './MissionHQ';
import CrewPlay from './CrewPlay';
import MissionRecords from './MissionRecords.jsx';
import {audioMixLevels,createAudioBuses} from './audioMixer.js';
import {createBackgroundMusic} from './backgroundMusic.js';

// NASA-style Earth imagery from the Three.js public example texture collection.
// Requires an internet connection to load the texture in the browser.
function Earth({ quality }) {
  const earthMap = useTexture('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
  const earthRef = useRef();
  const cloudsRef = useRef();
  const cloudMap = useRef(null);

  if (!cloudMap.current) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    // A light procedural cloud layer (not a geographic map).
    let seed = 12491;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 520; i++) {
      const x = random() * 1024, y = random() * 512;
      const radius = 5 + random() * 24;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255,255,255,0.28)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    cloudMap.current = new THREE.CanvasTexture(canvas);
  }

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.035;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.042;
  });

  const segments = quality === 'Low' ? 40 : quality === 'Medium' ? 64 : 96;
  return (
    <group rotation={[0.15, -0.4, 0]}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2.15, segments, segments]} />
        <meshStandardMaterial map={earthMap} roughness={1} metalness={0} />
      </mesh>
      <mesh ref={cloudsRef} visible={quality !== 'Low'}>
        <sphereGeometry args={[2.18, segments, segments]} />
        <meshBasicMaterial map={cloudMap.current} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh scale={1.055}>
        <sphereGeometry args={[2.15, 64, 64]} />
        <meshBasicMaterial color="#2b9fff" transparent opacity={0.09} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SpaceScene({ quality }) {
  return (
    <div className="space-scene" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 7.5], fov: 48 }} dpr={quality === 'Low' ? 1 : quality === 'Medium' ? 1.5 : [1, 2]} gl={{ antialias: quality !== 'Low' }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={2.7} color="#d9eeff" />
        <Stars radius={90} depth={55} count={quality === 'Low' ? 900 : quality === 'Medium' ? 1800 : 3200} factor={3} saturation={0} fade speed={0.25} />
        <Earth quality={quality} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}


function useGameAudio(master, music, effects, musicEnabled) {
  const [scene, setScene] = useState('menu');
  const audio = useRef(null);

  const startAudio = async () => {
    if (!audio.current) {
      const context = new (window.AudioContext || window.webkitAudioContext)();

      const {masterGain,musicGain,effectsGain} = createAudioBuses(context, audioMixLevels(master,music,effects,musicEnabled));

      const background=createBackgroundMusic(context,musicGain);
      audio.current={context,masterGain,musicGain,effectsGain,background};
    }
    if(musicEnabled)audio.current.background.play();

    if (audio.current.context.state === 'suspended') {
      await audio.current.context.resume();
    }
  };

  const playTone = (context, destination, startFreq, endFreq, duration, volume) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFreq, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gain);
    gain.connect(destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  };

  const playMenuSound = async (buttonName = '') => {
    await startAudio();

    const { context, effectsGain } = audio.current;

    if (buttonName.includes('SINGLE PLAYER')) {
      playTone(context, effectsGain, 300, 650, 0.45, 0.45);
    } else if (buttonName.includes('MULTIPLAYER')) {
      playTone(context, effectsGain, 420, 820, 0.3, 0.35);
    } else if (buttonName.includes('SETTINGS')) {
      playTone(context, effectsGain, 600, 420, 0.12, 0.25);
    } else {
      playTone(context, effectsGain, 650, 450, 0.1, 0.3);
    }
  };

  useEffect(() => {
    if (!audio.current) return;

    const { context, masterGain, musicGain, effectsGain } = audio.current;
    const now = context.currentTime;

    const levels=audioMixLevels(master,music,effects,musicEnabled);
    masterGain.gain.setTargetAtTime(levels.master, now, 0.05);
    musicGain.gain.setTargetAtTime(levels.music, now, 0.08);
    effectsGain.gain.setTargetAtTime(levels.effects, now, 0.05);
    if(musicEnabled)audio.current.background.play();else audio.current.background.pause();
  }, [master, music, effects, musicEnabled, scene]);

  const playEffect = async (name = 'click') => {
    await startAudio();
    if (!audio.current) return;
    const { context, effectsGain } = audio.current;
    const sounds = {
      terminal: [[390, 780, 0.16, 0.28], [780, 1080, 0.19, 0.19]],
      close: [[670, 270, 0.22, 0.23]],
      select: [[480, 690, 0.11, 0.16]],
      confirm: [[460, 700, 0.20, 0.22], [700, 1000, 0.35, 0.19]],
      assembly: [[300, 560, 0.35, 0.27]],
      click: [[550, 720, 0.10, 0.13]],
    };
    (sounds[name] || sounds.click).forEach(([from, to, length, volume], index) => {
      // Small delayed second tone for a satisfying confirmation sequence.
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const t = context.currentTime + index * 0.16;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(from, t);
      oscillator.frequency.exponentialRampToValueAtTime(to, t + length);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + length);
      oscillator.connect(gain);
      gain.connect(effectsGain);
      oscillator.start(t);
      oscillator.stop(t + length + 0.01);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  };

  useEffect(() => {
    return () => {
      if (audio.current) {
        audio.current.background.close();
        audio.current.context.close();
        audio.current = null;
      }
    };
  }, []);

  return { startAudio, playMenuSound, playEffect, setScene };
}


const DEFAULT_SETTINGS = { master: 80, music: 55, musicEnabled: true, effects: 80, quality: 'High', hints: true };

export default function App() {
  const [screen, setScreen] = useState('home');
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('mission-settings') || '{}') }; }
    catch { return DEFAULT_SETTINGS; }
  });
  const [crewSession, setCrewSession] = useState(null);
  const { startAudio, playMenuSound, playEffect, setScene } = useGameAudio(settings.master, settings.music, settings.effects, settings.musicEnabled);
  useEffect(() => { setScene(screen === 'hq' ? 'hq' : 'menu'); }, [screen, setScene]);
  const gameAudio = { playEffect, setScene, startAudio };
  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem('mission-settings', JSON.stringify(next));
  };

  if (screen === 'hq') {
  return <><MissionHQ audio={gameAudio} onExit={() => setScreen('home')} />{crewSession && <CrewPlay session={crewSession} onSession={setCrewSession} compact />}</>;}

  return (
    <main className="game"onPointerDown={() => {startAudio();}}>
      <SpaceScene quality={settings.quality} />
      <div className="vignette" />
      <header className="topbar">
        <div className="brand"><span className="brand-mark">✦</span> MISSION CONTROL <span className="brand-muted">/ BEYOND EARTH</span></div>
        <div className="top-status"><span className="status-dot" /> SYSTEM ONLINE <span className="version">VERSION 0.14</span></div>
      </header>

      <section className="panel" onClick={(event) => {
        const button = event.target.closest('button');
        if (button) {
          playMenuSound(button.textContent);
        }}}>
          
        {screen !== 'home' && <button className="back" onClick={() => setScreen('home')}><ChevronLeft size={17} /> BACK TO MENU</button>}
        {screen === 'home' && <>
          <div className="eyebrow">SPACE MISSION DESIGN SIMULATOR</div>
          <h1>BEYOND<br /><span>EARTH</span></h1>
          <p className="intro">Every mission begins with a decision. Design your spacecraft, lead your crew, and explore beyond the horizon.</p>
          <div className="menu">
            <button className="menu-btn primary" onClick={() => setScreen('single')}><Rocket size={19} /> SINGLE PLAYER <span>01</span></button>
            <button className="menu-btn" onClick={() => setScreen('multi')}><Users size={19} /> MULTIPLAYER <span>02</span></button>
            <button className="menu-btn" onClick={() => setScreen('tutorial')}><BookOpen size={19} /> TUTORIAL <span>03</span></button>
            <button className="menu-btn" onClick={() => setScreen('records')}><Trophy size={19} /> MISSION RECORDS <span>04</span></button>
            <button className="menu-btn" onClick={() => setScreen('settings')}><Settings size={19} /> SETTINGS <span>05</span></button>
          </div>
        </>}
        {screen === 'single' && <>
          <div className="eyebrow">MISSION 001 / EARTH ORBIT</div>
          <h2>EARTH OBSERVER</h2>
          <p className="intro">Design and launch an Earth-observation satellite. Balance power, mass, budget and scientific capability.</p>
          <div className="info-card"><strong>MISSION OBJECTIVES</strong><p>Build a spacecraft · Select a launch vehicle · Reach orbit · Collect science data</p></div>
          <button className="action" onClick={() => setScreen('hq')}> ENTER MISSION HEADQUARTERS</button>
        </>}
        {screen === 'multi' && <CrewPlay session={crewSession} onSession={setCrewSession} onStart={() => setScreen('hq')} />}
        {screen === 'tutorial' && <>
          <div className="eyebrow">FLIGHT ACADEMY</div><h2>YOUR FIRST MISSION</h2>
          <div className="info-card"><strong>01 — PLAN</strong><p>Choose a mission objective and understand the engineering requirements.</p></div>
          <div className="info-card"><strong>02 — BUILD</strong><p>Select spacecraft components while balancing mass, power and budget.</p></div>
          <div className="info-card"><strong>03 — LAUNCH</strong><p>Test your design, launch and respond to mission events.</p></div>
        </>}
        {screen === 'records' && <MissionRecords />}
        {screen === 'settings' && <>
          <div className="eyebrow">SYSTEM CONFIGURATION</div><h2>SETTINGS</h2>
          <div className="settings-row"><label htmlFor="master">MASTER VOLUME <span>{settings.master}%</span></label><input id="master" type="range" min="0" max="100" value={settings.master} onChange={e => updateSetting('master', Number(e.target.value))} /></div>
          <div className="settings-row checkbox-row">
            <label htmlFor="musicEnabled">
              BACKGROUND MUSIC
            </label>
            <input
            id="musicEnabled"
            type="checkbox"
            checked={settings.musicEnabled}
            onChange={e =>
              updateSetting('musicEnabled', e.target.checked)}/>
          </div>
          <div className="settings-row"><label htmlFor="music"><Volume2 size={16} /> MUSIC VOLUME <span>{settings.music}%</span></label><input id="music" type="range" min="0" max="100" value={settings.music} onChange={e => updateSetting('music', Number(e.target.value))} /></div>
          <div className="settings-row"><label htmlFor="effects">SOUND EFFECTS <span>{settings.effects}%</span></label><input id="effects" type="range" min="0" max="100" value={settings.effects} onChange={e => updateSetting('effects', Number(e.target.value))} /></div>
          <p style={{fontSize:10,lineHeight:1.5,color:'#9eb6c0'}}>Music: <a href="https://www.scottbuckley.com.au/library/hymn/" target="_blank" rel="noreferrer" style={{color:'inherit'}}>‘Hymn’ by Scott Buckley</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" style={{color:'inherit'}}>CC BY 4.0</a></p>
          <div className="settings-row"><label htmlFor="quality">GRAPHICS PRESET</label><select id="quality" value={settings.quality} onChange={e => updateSetting('quality', e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></div>
          <div className="settings-row checkbox-row"><label htmlFor="hints">GAMEPLAY HINTS</label><input id="hints" type="checkbox" checked={settings.hints} onChange={e => updateSetting('hints', e.target.checked)} /></div>
        </>}
      </section>
      <footer><span>MISSION CONTROL / COMMAND INTERFACE</span><span>EARTH OPERATIONS • EST. 2026</span></footer>
    </main>
  );
}

