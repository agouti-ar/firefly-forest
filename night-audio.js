// Quiet procedural night ambience. Audio starts only after an explicit click.
const toggle = document.createElement('button');
toggle.type = 'button';
toggle.className = 'night-audio-toggle';
toggle.textContent = 'Звук ночи: выкл';
toggle.setAttribute('aria-pressed', 'false');
toggle.setAttribute('aria-label', 'Включить тихие звуки ночи');
document.body.append(toggle);

let context, master, enabled = false, scheduler, noise;
let nextCricket = 0, nextFrog = 0;

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

function scheduleNight() {
  if (!enabled || document.hidden || context.state !== 'running') return;
  const now = context.currentTime;
  if (now >= nextCricket) {
    const pan = Math.random() * 1.4 - 0.7;
    const frequency = 3200 + Math.random() * 900;
    for (let i = 0; i < 5; i++) {
      const start = now + 0.04 + i * 0.074;
      voice(frequency, start, 0.045, 0.018, pan);
      voice(frequency * 1.035, start + 0.025, 0.035, 0.01, pan);
    }
    nextCricket = now + 1.2 + Math.random() * 1.7;
  }
  if (now >= nextFrog) {
    const start = now + 0.04;
    const pan = Math.random() * 1.2 - 0.6;
    voice(175, start, 0.22, 0.045, pan, 100);
    voice(145, start + 0.28, 0.2, 0.03, pan, 90);
    nextFrog = now + 17 + Math.random() * 16;
  }
}

function createAmbience() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) throw new Error('Web Audio is unavailable');
  context = new AudioEngine();
  master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < samples.length; i++) {
    previous = (previous + (Math.random() * 2 - 1) * 0.025) / 1.025;
    samples[i] = previous;
  }
  noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1100;
  const bed = context.createGain();
  bed.gain.value = 0.025;
  noise.connect(lowpass).connect(bed).connect(master);
  noise.start();
}

toggle.addEventListener('click', async () => {
  toggle.disabled = true;
  try {
    if (!context) createAmbience();
    await context.resume();
    enabled = !enabled;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(enabled ? 0.4 : 0, context.currentTime, 0.15);
    toggle.textContent = enabled ? 'Звук ночи: вкл' : 'Звук ночи: выкл';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Выключить звуки ночи' : 'Включить тихие звуки ночи');
    clearInterval(scheduler);
    if (enabled) {
      nextCricket = context.currentTime + 0.2;
      nextFrog = context.currentTime + 12;
      scheduler = setInterval(scheduleNight, 350);
    }
  } catch {
    toggle.textContent = 'Звук недоступен';
    enabled = false;
    toggle.setAttribute('aria-pressed', 'false');
  } finally {
    toggle.disabled = false;
  }
});

document.addEventListener('visibilitychange', async () => {
  if (!context) return;
  if (document.hidden) await context.suspend();
  else if (enabled) {
    try { await context.resume(); } catch { /* Click the toggle to resume. */ }
  }
});

window.addEventListener('pagehide', () => {
  clearInterval(scheduler);
  if (context) context.close().catch(() => {});
});
