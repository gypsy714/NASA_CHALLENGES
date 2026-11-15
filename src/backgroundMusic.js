export const SOUNDTRACK_URL='/audio/hymn-scott-buckley.mp3';
export const SOUNDTRACK_GAIN=1;

// One shared path for live playback and offline output-level verification.
export function connectSoundtrack(context,source,destination){
 const compression=context.createDynamicsCompressor();
 compression.threshold.value=-18;compression.knee.value=12;compression.ratio.value=3;
 compression.attack.value=.002;compression.release.value=.25;
 const level=context.createGain();level.gain.value=SOUNDTRACK_GAIN;
 source.connect(compression);compression.connect(level);level.connect(destination);
 return {disconnect(){source.disconnect();compression.disconnect();level.disconnect();}};
}

export function createBackgroundMusic(context,destination){
 const track=document.createElement('audio');
 track.src=SOUNDTRACK_URL;track.loop=true;track.preload='auto';track.volume=1;
 track.hidden=true;track.setAttribute('data-game-background','piano');document.body.appendChild(track);
 const source=context.createMediaElementSource(track),route=connectSoundtrack(context,source,destination);
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('beyond-earth-music'):null;
 const owner=globalThis.crypto?.randomUUID?.()||String(Math.random());
 let closed=false;
 if(channel)channel.onmessage=e=>{if(e.data?.type==='music-playing'&&e.data.owner!==owner)track.pause();};
 return {
  play(){
   if(closed||!track.paused)return;
   channel?.postMessage({type:'music-playing',owner});
   track.play().catch(()=>{/* Browser will retry on the next user interaction. */});
  },
  pause(){track.pause();},
  close(){if(closed)return;closed=true;track.pause();track.removeAttribute('src');track.load();route.disconnect();channel?.close();track.remove();},
 };
}
