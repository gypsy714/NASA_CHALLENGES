export function audioMixLevels(master, music, effects, musicEnabled) {
  const level = value => Math.max(0, Math.min(100, Number(value) || 0)) / 100;
  return { master: level(master), music: musicEnabled ? level(music) : 0, effects: level(effects) };
}

export function createAudioBuses(context, levels) {
  const masterGain = context.createGain();
  const musicGain = context.createGain();
  const effectsGain = context.createGain();
  // Control overlapping synth peaks before applying the player's master volume.
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -6;
  compressor.knee.value = 6;
  compressor.ratio.value = 8;
  compressor.attack.value = .003;
  compressor.release.value = .2;
  musicGain.connect(compressor);
  effectsGain.connect(compressor);
  compressor.connect(masterGain);
  masterGain.connect(context.destination);
  masterGain.gain.value = levels.master;
  musicGain.gain.value = levels.music;
  effectsGain.gain.value = levels.effects;
  return {masterGain, musicGain, effectsGain, compressor};
}
