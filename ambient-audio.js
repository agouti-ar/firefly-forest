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
let volume = 0.75;
try {
  const saved = localStorage.getItem('firefly-forest-volume');
  if (saved !== null && Number.isFinite(Number(saved))) volume = Math.max(0, Math.min(1, Number(saved)));
} catch { /* Storage can be disabled in private previews. */ }
volumeControl.value = String(Math.round(volume * 100));
panel.append(toggle, volumeControl);
document.body.append(panel);

const speaker = '<path d="M11 5 6 9H3v6h3l5 4V5Z"/>';
const waves = '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>';
const mute = '<path d="m16 9 5 6m0-6-5 6"/>';
let context, master, splashBuffer, scheduler, enabled = false;
let cricketTimes = [], frogTimes = [];

function updateControl() {
  toggle.innerHTML = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${speaker}${enabled ? waves : mute}</svg><span>Sound ${enabled ? 'on' : 'off'}</span>`;
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', enabled ? 'Turn ambient sound off' : 'Turn ambient sound on');
  volumeControl.title = `Volume: ${Math.round(volume * 100)}%`;
}
function applyVolume() {
  if (!context || !master) return;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(enabled ? volume * 2 : 0, context.currentTime, 0.12);
}

function voice(frequency, start, duration, amplitude, pan, endFrequency = frequency) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const stereo = context.createStereoPanner();
  oscillator.type = frequency < 500 ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(amplitude, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.00001, start + duration);
  stereo.pan.value = pan;
  oscillator.connect(envelope).connect(stereo).connect(master);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); stereo.disconnect(); };
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function splash(strength = 1, pan = 0) {
  if (!enabled || !context || context.state !== 'running' || document.hidden) return;
  const start = context.currentTime + 0.02;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const stereo = context.createStereoPanner();
  source.buffer = splashBuffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, start);
  filter.frequency.exponentialRampToValueAtTime(350, start + 0.55);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(0.22 * strength, start + 0.018);
  envelope.gain.exponentialRampToValueAtTime(0.00001, start + 0.6);
  stereo.pan.value = Math.max(-0.8, Math.min(0.8, pan));
  source.connect(filter).connect(envelope).connect(stereo).connect(master);
  source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); stereo.disconnect(); };
  source.start(start);
  source.stop(start + 0.65);
  voice(310, start + 0.03, 0.18, 0.06 * strength, pan, 115);
  voice(430, start + 0.12, 0.2, 0.035 * strength, pan, 180);
}

function scheduleNight() {
  if (!enabled || document.hidden || context.state !== 'running') return;
  const now = context.currentTime;
  for (let actor = 0; actor < cricketTimes.length; actor++) {
    if (now < cricketTimes[actor]) continue;
    const frequency = [2900, 3550, 4200][actor] + Math.random() * 180;
    const pan = [-0.65, 0.4, 0.05][actor];
    const pulses = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pulses; i++) {
      voice(frequency, now + 0.025 + i * 0.073, 0.057,
        0.065 + Math.random() * 0.025, pan, frequency * 0.985);
    }
    cricketTimes[actor] = now + pulses * 0.073 + 0.1 + Math.random() * 0.25;
  }
  for (let actor = 0; actor < frogTimes.length; actor++) {
    if (now < frogTimes[actor]) continue;
    const frequency = [145, 205, 115][actor];
    const pan = [-0.5, 0.55, 0.1][actor];
    for (let i = 0; i < 3; i++) {
      voice(frequency, now + 0.03 + i * 0.28, 0.23, 0.13 - i * 0.015, pan, frequency * 0.63);
    }
    frogTimes[actor] = now + 4 + actor * 0.7 + Math.random() * 2;
  }
}

function createAmbience() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) throw new Error('Web Audio is unavailable');
  context = new AudioEngine();
  master = context.createGain();
  master.gain.value = 0;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.25;
  master.connect(compressor).connect(context.destination);

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
  water.connect(filter).connect(bed).connect(master);
  water.start();
  splashBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const splashSamples = splashBuffer.getChannelData(0);
  for (let i = 0; i < splashSamples.length; i++) splashSamples[i] = Math.random() * 2 - 1;
}

toggle.addEventListener('click', async () => {
  toggle.disabled = true;
  try {
    if (!context || context.state === 'closed') createAmbience();
    await context.resume();
    enabled = !enabled;
    applyVolume();
    clearInterval(scheduler);
    if (enabled) {
      const now = context.currentTime;
      cricketTimes = [now, now + 0.2, now + 0.4];
      frogTimes = [now + 0.8, now + 2.1, now + 3.4];
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
  try { localStorage.setItem('firefly-forest-volume', String(volume)); } catch { /* Optional. */ }
});
window.addEventListener('pond-splash', event => splash(event.detail?.strength ?? 1,
  (event.detail?.x ?? 0) / 22));
window.addEventListener('pond-frog', () => {
  if (enabled && context?.state === 'running' && !document.hidden) {
    voice(180, context.currentTime + 0.02, 0.25, 0.1, 0, 105);
  }
});
document.addEventListener('visibilitychange', async () => {
  if (!context || context.state === 'closed') return;
  try {
    if (document.hidden) await context.suspend();
    else if (enabled) await context.resume();
  } catch { /* A page transition may have closed the context. */ }
});
window.addEventListener('pagehide', () => {
  clearInterval(scheduler);
  enabled = false;
  if (context) context.close().catch(() => {});
  context = undefined;
  updateControl();
});
updateControl();
