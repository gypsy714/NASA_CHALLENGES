// AI-assisted procedural instrument cues. Existing soundtrack and Earth audio are untouched.
// Sounds are local feedback heard through Mission Control, not vacuum propagation.
export function createMarsAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return { cue() {}, engine() {}, close() {} };
  const context = new AudioContext(), bus = context.createGain();
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('mission-settings') || '{}'); } catch { /* defaults */ }
  bus.gain.value = (settings.master ?? 80) / 100 * (settings.effects ?? 70) / 100;
  bus.connect(context.destination);
  let motor = null, motorGain = null;
  function cue(frequency = 740, duration = .12) {
    context.resume().catch(() => {});
    const oscillator = context.createOscillator(), gain = context.createGain(), t = context.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(.055, t + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(gain).connect(bus); oscillator.start(t); oscillator.stop(t + duration + .03);
  }
  function engine(throttle) {
    if (throttle <= 0) {
      if (motor) { motorGain.gain.setTargetAtTime(.0001, context.currentTime, .08); motor.stop(context.currentTime + .3); motor = null; }
      return;
    }
    context.resume().catch(() => {});
    if (!motor) {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      motor = context.createBufferSource(); motor.buffer = buffer; motor.loop = true;
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 380;
      motorGain = context.createGain(); motorGain.gain.value = .0001;
      motor.connect(filter).connect(motorGain).connect(bus); motor.start();
    }
    motorGain.gain.setTargetAtTime(.015 + throttle / 100 * .045, context.currentTime, .15);
  }
  return { cue, engine, close() { engine(0); setTimeout(() => context.close().catch(() => {}), 400); } };
}
