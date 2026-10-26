// Layered procedural ambience. All sound still requires an explicit user gesture.
const panel = document.createElement('div');
panel.className = 'night-audio-controls';
panel.setAttribute('role', 'group');
panel.setAttribute('aria-label', 'Ambient sound controls');
const toggle = document.createElement('button');
toggle.type = 'button';
toggle.className = 'night-audio-toggle';
const volumeControl = document.createElement('input');
volumeControl.type = 'range';
volumeControl.min = '0';
volumeControl.max = '100';
volumeControl.step = '1';
volumeControl.className = 'night-audio-volume';
volumeControl.setAttribute('aria-label', 'Ambient volume');
let volume = 0.40;
try {
  const saved = localStorage.getItem('firefly-forest-nature-volume-v2');
  if (saved !== null && Number.isFinite(Number(saved))) volume = Math.max(0, Math.min(1, Number(saved)));
} catch { /* Storage can be disabled in private previews. */ }
volumeControl.value = String(Math.round(volume * 100));
const musicControl = volumeControl.cloneNode();
musicControl.setAttribute('aria-label', 'Music volume');
let musicVolume = 0.65;
try {
  const saved = localStorage.getItem('firefly-forest-music-volume');
  if (saved !== null && Number.isFinite(Number(saved))) musicVolume = Math.max(0, Math.min(1, Number(saved)));
} catch { /* Optional storage. */ }
musicControl.value = String(Math.round(musicVolume * 100));
function labeledSlider(text, control) {
  const label = document.createElement('label');
  label.className = 'night-audio-channel';
  const caption = document.createElement('span'); caption.textContent = text;
  label.append(caption, control); return label;
}
panel.append(toggle, labeledSlider('Nature', volumeControl), labeledSlider('Music', musicControl));
// Stream the soundtrack instead of decoding the entire song into mobile memory.
let music = document.createElement('audio');
music.src = new URL('./assets/audio/petals-beneath-the-moon.mp3', import.meta.url).href;
music.preload = 'none'; music.loop = true;
music.addEventListener('error', () => { panel.dataset.music = 'unavailable'; });
document.body.append(panel);

const speaker = '<path d="M11 5 6 9H3v6h3l5 4V5Z"/>';
const waves = '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>';
const mute = '<path d="m16 9 5 6m0-6-5 6"/>';
let context, master, output, musicGain, splashBuffer, scheduler, enabled = false;
let cricketTimes = [], frogTimes = [];
let naturalReady = false, naturalBuffers = {}, nextOwl = 0;
let listenerPose;
const spatialBeds = new Set();
const owlPosition = [8.3, 4.95, 8];

// World units match the Three.js scene. Equal-power panning avoids expensive HRTF convolution.
function spatialNode(position, reference = 18, rolloff = 1.1) {
  if (!context.createPanner) return context.createStereoPanner();
  const node = context.createPanner();
  node.panningModel = 'equalpower';
  node.distanceModel = 'inverse';
  node.refDistance = reference;
  node.maxDistance = 400;
  node.rolloffFactor = rolloff;
  node.coneInnerAngle = 360;
  if (node.positionX) ['X', 'Y', 'Z'].forEach((axis, i) => { node[`position${axis}`].value = position[i]; });
  else node.setPosition(...position);
  return node;
}
function updateListener() {
  if (!context || !listenerPose || context.state !== 'running') return;
  const listener = context.listener;
  if (!listener) return;
  const { position, forward, up } = listenerPose;
  if (listener.positionX) {
    for (let i = 0; i < 3; i++) {
      const axis = ['X', 'Y', 'Z'][i];
      listener[`position${axis}`].setTargetAtTime(position[i], context.currentTime, 0.04);
      listener[`forward${axis}`].setTargetAtTime(forward[i], context.currentTime, 0.04);
      listener[`up${axis}`].setTargetAtTime(up[i], context.currentTime, 0.04);
    }
  } else {
    listener.setPosition(...position);
    listener.setOrientation(...forward, ...up);
  }
  for (const bed of spatialBeds) {
    const distance = Math.hypot(...bed.position.map((coordinate, i) => coordinate - position[i]));
    const t = Math.max(0, Math.min(1, (distance - bed.fadeStart) / (bed.fadeEnd - bed.fadeStart)));
    bed.fade.gain.setTargetAtTime(1 - t * t * (3 - 2 * t), context.currentTime, 0.12);
    bed.air.frequency.setTargetAtTime(bed.night ? Math.max(2200, 5000 - distance * 30) : 12000,
      context.currentTime, 0.12);
  }
}
window.addEventListener('forest-listener', event => { listenerPose = event.detail; updateListener(); });

function rms(buffer) {
  const data = buffer.getChannelData(0);
  let sum = 0, samples = 0;
  for (let i = 0; i < data.length; i += 97) { sum += data[i] * data[i]; samples++; }
  return Math.sqrt(sum / Math.max(1, samples));
}
async function seamlessLoop(engine, buffer, seconds) {
  const rate = buffer.sampleRate;
  const available = Math.min(buffer.length, Math.floor((seconds + 2) * rate));
  const overlap = Math.min(Math.floor(rate * 2), Math.floor(available / 6));
  const length = available - overlap;
  const output = engine.createBuffer(buffer.numberOfChannels, length, rate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const input = buffer.getChannelData(channel), data = output.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      // Yield between chunks so preparing long recordings does not block touch/animation.
      if (i > 0 && i % 65536 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      if (i < length - overlap) data[i] = input[i + overlap];
      else {
        const t = (i - length + overlap) / overlap;
        data[i] = input[i + overlap] * Math.cos(t * Math.PI / 2)
          + input[i - length + overlap] * Math.sin(t * Math.PI / 2);
      }
    }
  }
  return output;
}
function startRecordedLoop(buffer, targetLevel, position, offset = 0, reference = 23, night = false) {
  const source = context.createBufferSource(), gain = context.createGain(), stereo = spatialNode(position, reference, night ? 0.7 : 1.1);
  const fade = context.createGain(), air = context.createBiquadFilter(), shelf = context.createBiquadFilter();
  air.type = 'lowpass'; air.frequency.value = night ? 4200 : 12000;
  shelf.type = 'highshelf'; shelf.frequency.value = 2800; shelf.gain.value = night ? -9 : 0;
  spatialBeds.add({ position, fade, air, night, fadeStart: night ? 55 : 80, fadeEnd: night ? 140 : 200 });
  source.buffer = buffer; source.loop = true;
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(Math.min(2.5, targetLevel / Math.max(0.015, rms(buffer))), context.currentTime + 2);
  source.connect(shelf).connect(air).connect(gain).connect(fade).connect(stereo).connect(master);
  source.start(0, offset % buffer.duration);
}
async function loadRecordings(engine) {
  panel.dataset.recordings = 'loading';
  try {
    const buffers = await Promise.all(['forest-night', 'stream', 'owl'].map(async name => {
      const response = await fetch(new URL(`./assets/audio/${name}.mp3`, import.meta.url));
      if (!response.ok) throw Error('Audio recording unavailable');
      const decoded = await engine.decodeAudioData(await response.arrayBuffer());
      return name === 'owl' ? decoded : seamlessLoop(engine, decoded, name === 'stream' ? 36 : 60);
    }));
    if (context !== engine || engine.state === 'closed') return;
    naturalBuffers = { night: buffers[0], stream: buffers[1], owl: buffers[2] };
    startRecordedLoop(naturalBuffers.night, 0.033, [-8, 1, -4], 7, 28, true);
    startRecordedLoop(naturalBuffers.night, 0.033, [7, 0.8, 6], 31, 28, true);
    startRecordedLoop(naturalBuffers.stream, 0.022, [-10, 0.65, 5]);
    startRecordedLoop(naturalBuffers.stream, 0.022, [9, 0.65, -5], 11);
    updateListener();
    naturalReady = true;
    panel.dataset.recordings = 'ready';
  } catch {
    if (context === engine) panel.dataset.recordings = 'fallback';
  }
}
function owlCall(now) {
  if (naturalBuffers.owl) {
    const source = context.createBufferSource(), gain = context.createGain(), stereo = spatialNode(owlPosition, 20);
    source.buffer = naturalBuffers.owl;
    gain.gain.value = Math.min(1.2, 0.07 / Math.max(0.02, rms(source.buffer)));
    source.connect(gain).connect(stereo).connect(master);
    source.onended = () => { source.disconnect(); gain.disconnect(); stereo.disconnect(); };
    source.start(now + 0.02);
  } else {
    voice(430, now + 0.02, 0.32, 0.055, -0.35, 360, owlPosition);
    voice(395, now + 0.5, 0.85, 0.07, -0.35, 335, owlPosition);
  }
}

function updateControl() {
  toggle.innerHTML = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${speaker}${enabled ? waves : mute}</svg><span>Sound ${enabled ? 'on' : 'off'}</span>`;
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
  musicControl.title = `Music: ${Math.round(musicVolume * 100)}%`;
  volumeControl.title = `Nature: ${Math.round(volume * 100)}%`;
}
function applyVolume() {
  if (!context || !master) return;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(volume * 2, context.currentTime, 0.12);
  musicGain.gain.setTargetAtTime(musicVolume * 0.65, context.currentTime, 0.25);
  output.gain.setTargetAtTime(enabled ? 1 : 0, context.currentTime, 0.12);
}

function voice(frequency, start, duration, amplitude, pan, endFrequency = frequency, position = [pan * 14, 1, 6]) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const stereo = spatialNode(position);
  oscillator.type = frequency < 500 ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(amplitude, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.00001, start + duration);
  oscillator.connect(envelope).connect(stereo).connect(master);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); stereo.disconnect(); };
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function splash(strength = 1, position = [0, 0.65, 0]) {
  if (!enabled || !context || context.state !== 'running' || document.hidden) return;
  const start = context.currentTime + 0.02;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const stereo = spatialNode(position, 16);
  source.buffer = splashBuffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, start);
  filter.frequency.exponentialRampToValueAtTime(350, start + 0.55);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(0.22 * strength, start + 0.018);
  envelope.gain.exponentialRampToValueAtTime(0.00001, start + 0.6);
  source.connect(filter).connect(envelope).connect(stereo).connect(master);
  source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); stereo.disconnect(); };
  source.start(start);
  source.stop(start + 0.65);
  voice(310, start + 0.03, 0.18, 0.06 * strength, 0, 115, position);
  voice(430, start + 0.12, 0.2, 0.035 * strength, 0, 180, position);
}

function scheduleNight() {
  if (!enabled || document.hidden || context.state !== 'running') return;
  const now = context.currentTime;
  for (let actor = 0; actor < cricketTimes.length; actor++) {
    if (naturalReady || panel.dataset.recordings === 'loading') break;
    if (now < cricketTimes[actor]) continue;
    const frequency = [2900, 3550, 4200][actor] + Math.random() * 180;
    const pan = [-0.65, 0.4, 0.05][actor];
    const pulses = 6 + Math.floor(Math.random() * 3);
    let cursor = now + 0.025;
    for (let i = 0; i < pulses; i++) {
      const pitch = frequency * (0.985 + Math.random() * 0.03);
      const duration = 0.04 + Math.random() * 0.035;
      voice(pitch, cursor, duration, 0.045 + Math.random() * 0.035, pan, pitch * 0.98);
      cursor += duration + 0.016 + Math.random() * 0.04;
    }
    cricketTimes[actor] = cursor + 0.04 + Math.random() * 0.3;
  }
  for (let actor = 0; actor < frogTimes.length; actor++) {
    if (naturalReady || panel.dataset.recordings === 'loading') break;
    if (now < frogTimes[actor]) continue;
    const frequency = [145, 205, 115][actor];
    const pan = [-0.5, 0.55, 0.1][actor];
    for (let i = 0; i < 3; i++) {
      voice(frequency, now + 0.03 + i * 0.28, 0.23, 0.13 - i * 0.015, pan, frequency * 0.63);
    }
    frogTimes[actor] = now + 4 + actor * 0.7 + Math.random() * 2;
  }
  if (now >= nextOwl && panel.dataset.recordings !== 'loading') {
    owlCall(now); nextOwl = now + 35 + Math.random() * 20;
  }
}

function createAmbience() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) throw new Error('Web Audio is unavailable');
  context = new AudioEngine();
  spatialBeds.clear();
  master = context.createGain();
  master.gain.value = 0;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.25;
  output = context.createGain(); output.gain.value = 0;
  musicGain = context.createGain(); musicGain.gain.value = 0;
  context.createMediaElementSource(music).connect(musicGain).connect(output);
  master.connect(output).connect(compressor).connect(context.destination);

  const noiseBuffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < samples.length; i++) {
    brown = (brown + (Math.random() * 2 - 1) * 0.08) / 1.08;
    samples[i] = brown;
  }
  const water = context.createBufferSource();
  water.buffer = noiseBuffer;
  water.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1600;
  const bed = context.createGain();
  bed.gain.value = 0.23;
  const modulation = context.createOscillator();
  modulation.frequency.value = 0.17;
  const depth = context.createGain();
  depth.gain.value = 0.065;
  modulation.connect(depth).connect(bed.gain);
  modulation.start();
  water.connect(filter).connect(bed).connect(spatialNode([0, 4, 0], 35, 0.55)).connect(master);
  water.start();
  splashBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const splashSamples = splashBuffer.getChannelData(0);
  for (let i = 0; i < splashSamples.length; i++) splashSamples[i] = Math.random() * 2 - 1;
  naturalReady = false;
  naturalBuffers = {};
  loadRecordings(context);
}

toggle.addEventListener('click', async () => {
  toggle.disabled = true;
  try {
    if (!context || context.state === 'closed') createAmbience();
    await context.resume();
    updateListener();
    enabled = !enabled;
    if (enabled) {
      try { await music.play(); panel.dataset.music = 'ready'; }
      catch { panel.dataset.music = 'unavailable'; }
    } else music.pause();
    applyVolume();
    clearInterval(scheduler);
    if (enabled) {
      const now = context.currentTime;
      cricketTimes = [now, now + 0.2, now + 0.4];
      frogTimes = [now + 0.8, now + 2.1, now + 3.4];
      nextOwl = now + 16;
      scheduleNight();
      scheduler = setInterval(scheduleNight, 100);
    }
    updateControl();
  } catch {
    enabled = false;
    toggle.textContent = 'Audio unavailable';
    toggle.setAttribute('aria-pressed', 'false');
  } finally { toggle.disabled = false; }
});
volumeControl.addEventListener('input', () => {
  volume = Number(volumeControl.value) / 100;
  applyVolume();
  updateControl();
  try { localStorage.setItem('firefly-forest-nature-volume-v2', String(volume)); } catch { /* Optional. */ }
});
musicControl.addEventListener('input', () => {
  musicVolume = Number(musicControl.value) / 100;
  applyVolume(); updateControl();
  try { localStorage.setItem('firefly-forest-music-volume', String(musicVolume)); } catch { /* Optional. */ }
});

// Hiding controls never changes playback. Keyboard focus and active drags stay usable.
let idleTimer, dragging = false, keyboardFocus = false;
function revealControls() {
  clearTimeout(idleTimer);
  panel.classList.remove('is-idle'); panel.inert = false;
  idleTimer = setTimeout(() => {
    if (dragging || (keyboardFocus && panel.contains(document.activeElement))) return;
    panel.classList.add('is-idle'); panel.inert = true;
  }, 4000);
}
window.addEventListener('pointermove', revealControls, { passive: true });
window.addEventListener('pointerdown', () => { keyboardFocus = false; revealControls(); }, { passive: true });
panel.addEventListener('pointerdown', () => { dragging = true; });
window.addEventListener('pointerup', () => { dragging = false; revealControls(); }, { passive: true });
window.addEventListener('pointercancel', () => { dragging = false; revealControls(); }, { passive: true });
window.addEventListener('keydown', () => { keyboardFocus = true; revealControls(); });
window.addEventListener('wheel', revealControls, { passive: true });
panel.addEventListener('focusout', revealControls);
panel.addEventListener('input', revealControls);
revealControls();

window.addEventListener('pond-splash', event => splash(event.detail?.strength ?? 1,
  [event.detail?.x ?? 0, 0.65, event.detail?.z ?? 0]));
window.addEventListener('pond-frog', event => {
  if (!naturalReady && panel.dataset.recordings !== 'loading'
      && enabled && context?.state === 'running' && !document.hidden) {
    voice(180, context.currentTime + 0.02, 0.25, 0.1, 0, 105,
      event.detail?.position ?? [0, 0.65, 0]);
  }
});
document.addEventListener('visibilitychange', async () => {
  if (!context || context.state === 'closed') return;
  try {
    if (document.hidden) { music.pause(); await context.suspend(); }
    else if (enabled) { revealControls(); await context.resume(); await music.play(); }
  } catch { /* A page transition may have closed the context. */ }
});
window.addEventListener('pagehide', () => {
  clearInterval(scheduler);
  clearTimeout(idleTimer); music.pause();
  enabled = false;
  if (context) context.close().catch(() => {});
  context = undefined;
  music = music.cloneNode();
  music.addEventListener('error', () => { panel.dataset.music = 'unavailable'; });
  spatialBeds.clear();
  updateControl();
});
updateControl();

window.addEventListener('pageshow', revealControls);
