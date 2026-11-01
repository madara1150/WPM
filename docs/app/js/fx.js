// เสียงกดปุ่มและเอฟเฟกต์ประกายไฟ ใช้ร่วมกันทุกหน้า
let audio = null;

function context() {
  audio ??= new (window.AudioContext ?? window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

const PROFILES = {
  click: { freq: 1800, q: 1.2, gain: 0.16, length: 0.03 },
  type: { freq: 900, q: 0.7, gain: 0.26, length: 0.055 },
};

export function playKey(profile, ok = true) {
  const sound = PROFILES[profile];
  if (!sound) return;
  try {
    const ctx = context();
    const frames = Math.floor(ctx.sampleRate * sound.length);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (ok ? sound.freq : 220) * (0.95 + Math.random() * 0.1);
    filter.Q.value = sound.q;
    const gain = ctx.createGain();
    gain.gain.value = ok ? sound.gain : sound.gain * 2.2;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch { /* เบราว์เซอร์ไม่รองรับเสียง: เล่นต่อแบบเงียบ */ }
}

const canvas = document.getElementById('fx');
const painter = canvas.getContext('2d');
const sparks = [];
let running = false;
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();

function frame() {
  painter.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= 0.022;
    if (s.life <= 0) { sparks.splice(i, 1); continue; }
    s.vy += 0.12;
    s.x += s.vx;
    s.y += s.vy;
    painter.globalAlpha = s.life;
    painter.fillStyle = s.color;
    painter.fillRect(s.x, s.y, s.size, s.size);
  }
  painter.globalAlpha = 1;
  if (sparks.length) requestAnimationFrame(frame);
  else running = false;
}

export function burst(x, y, count = 14, color = null) {
  if (calm()) return;
  const fill = color ?? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4.5;
    sparks.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 0.7 + Math.random() * 0.3,
      size: 2 + Math.random() * 3,
      color: fill,
    });
  }
  if (!running) {
    running = true;
    requestAnimationFrame(frame);
  }
}

export function toast(title, note = '') {
  const host = document.getElementById('toasts');
  const item = document.createElement('div');
  item.className = 'toast';
  item.innerHTML = `<b>${title}</b>${note ? `<span>${note}</span>` : ''}`;
  host.append(item);
  setTimeout(() => item.remove(), 4500);
}
