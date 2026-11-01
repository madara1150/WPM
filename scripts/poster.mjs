// เก็บภาพหน้าจอจากแอปจริง แล้ว render poster เป็น JPG ด้วย Chrome แบบ headless
// node scripts/poster.mjs            ทำทั้งภาพหน้าจอและ poster
// node scripts/poster.mjs --poster   render เฉพาะ poster
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const posterDir = join(root, 'poster');
const screenDir = join(posterDir, 'screens');
const PORT = 5178;
const DEBUG_PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chromePath = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && existsSync(p));
if (!chromePath) throw new Error('ไม่พบ Chrome: กำหนดตำแหน่งด้วยตัวแปร CHROME');

class Page {
  #id = 0;
  #pending = new Map();
  #loaded = null;

  constructor(socket) {
    this.socket = socket;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Page.loadEventFired') this.#loaded?.();
      const waiter = this.#pending.get(message.id);
      if (!waiter) return;
      this.#pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.#id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }));
  }

  async #go(url) {
    const loaded = new Promise((resolve) => { this.#loaded = resolve; });
    await this.send('Page.navigate', { url });
    await loaded;
  }

  async open(url) {
    // เปลี่ยนแค่ #hash จะไม่เกิด load event จึงผ่านหน้าเปล่าก่อน
    await this.#go('about:blank');
    await this.#go(url);
    await this.run('document.fonts.ready.then(() => 1)');
    await sleep(300);
  }

  async run(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }

  size(width, height, scale) {
    return this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  }

  async shot(file, format = 'png') {
    const { data } = await this.send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 92 } : {}) });
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log('บันทึก', file.replace(root, ''));
  }
}

// ข้อมูลตัวอย่างสำหรับภาพหน้าจอ เพื่อให้เห็นหน้าสถิติที่มีประวัติการฝึก
function demoState() {
  const day = 86400000;
  const now = Date.now();
  const history = Array.from({ length: 36 }, (_, i) => {
    const wave = Math.sin(i * 1.7) * 3.5 + Math.cos(i * 0.6) * 2;
    const value = 34 + i * 0.75 + wave;
    return {
      at: now - (35 - i) * day * 0.34,
      wpm: value,
      raw: value + 3,
      acc: 92 + (i % 7) * 0.6 + i * 0.05,
      con: 72 + (i % 5) * 2,
      secs: 30,
      lang: i % 4 === 3 ? 'en' : 'th',
      mode: 'time',
      param: 30,
      diff: 'easy',
    };
  });
  const miss = (ch, n, total = 60) => [ch, { hit: total, miss: n }];
  return {
    settings: { mode: 'time', time: 30, words: 25, lang: 'th', difficulty: 'easy', failMode: 'off', sound: 'off', keyboard: true, ghost: true, caret: 'bar', size: 'm', theme: 'ember' },
    history,
    bests: {
      'time:30:th:easy': { wpm: 52, acc: 96, at: now, progress: Array.from({ length: 30 }, (_, i) => Math.round((i + 1) * 4.33)) },
      'time:15:th:easy': { wpm: 78, acc: 96, at: now, progress: Array.from({ length: 15 }, (_, i) => Math.round((i + 1) * 6.5)) },
    },
    keyStats: {
      th: Object.fromEntries([
        miss('ก', 3), miss('า', 2), miss('น', 2), miss('ร', 4), miss('ด', 9), miss('เ', 5), miss('ง', 14),
        miss('้', 19), miss('่', 11), miss('ี', 7), miss('ู', 16, 30), miss('ษ', 12, 20), miss('ถ', 9, 40),
        miss('ผ', 10, 40), miss('ฝ', 11, 25), miss('ข', 6, 40), miss('ม', 3), miss('ท', 2), miss('ส', 4),
      ]),
    },
    rainBest: 2460,
    rainGames: 14,
    earned: Object.fromEntries(['first', 'wpm40', 'wpm60', 'steady', 'thai', 'daily', 'streak3', 'coder', 'rain'].map((id) => [id, now])),
  };
}

// ป้อนปุ่มในจังหวะใกล้เคียงคนจริง มีเร่งมีผ่อน และพลาดบ้าง
const TYPIST = `window.__type = async (limitMs) => {
  const input = document.getElementById('input');
  input.focus();
  const chars = Array.from([...document.querySelectorAll('#text-inner .word')].map((w) => w.textContent).join(''));
  const start = performance.now();
  for (let i = 0; i < chars.length; i++) {
    const t = performance.now() - start;
    if (t > limitMs || document.getElementById('stage').hidden) break;
    const miss = i % 37 === 23;
    input.value = '__' + (miss ? 'ก' : chars[i]);
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const pace = 118 + Math.sin(t / 1400) * 38 + Math.sin(t / 430) * 14;
    await new Promise((r) => setTimeout(r, pace + (chars[i] === ' ' ? 45 : 0)));
  }
};`;

async function captureScreens(page) {
  mkdirSync(screenDir, { recursive: true });
  const base = `http://localhost:${PORT}/`;
  await page.size(1040, 780, 2);
  await page.open(base);
  await page.run(`localStorage.setItem('justtype:v1', ${JSON.stringify(JSON.stringify(demoState()))}); 1`);

  await page.open(`${base}#type`);
  await page.run(TYPIST);
  await page.run('__type(10500)');
  await page.shot(join(screenDir, 'typing.png'));

  await page.size(1040, 860, 2);
  await page.open(`${base}#type`);
  await page.run(TYPIST);
  await page.run(`[...document.querySelectorAll('#config button')].find((b) => b.textContent === '15 วิ').click(); 1`);
  await page.run('__type(16500)');
  await sleep(6500);
  await page.shot(join(screenDir, 'results.png'));

  await page.open(`${base}#stats`);
  await sleep(300);
  await page.shot(join(screenDir, 'stats.png'));

  await page.size(1040, 780, 2);
  await page.open(`${base}#rain`);
  await page.run(`(async () => {
    document.querySelector('[data-start]').click();
    const input = document.getElementById('rain-input');
    const send = (ch) => {
      input.value = '__' + ch;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    };
    const fall = (el) => new DOMMatrix(getComputedStyle(el).transform).m42;
    const lowest = () => [...document.querySelectorAll('.drop')].sort((a, b) => fall(b) - fall(a))[0];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const floor = document.getElementById('rain-area').clientHeight;
    // เก็บเฉพาะคำที่ใกล้พื้น ให้ภาพมีคำค้างอยู่หลายระดับ
    for (let round = 0; round < 40; round++) {
      await wait(500);
      const drop = lowest();
      if (!drop || fall(drop) < floor * 0.68) continue;
      for (const ch of Array.from(drop.textContent)) { send(ch); await wait(90); }
    }
    const target = lowest();
    if (target) for (const ch of Array.from(target.textContent).slice(0, 2)) { send(ch); await wait(90); }
  })()`);
  await page.shot(join(screenDir, 'rain.png'));
}

async function main() {
  const onlyPoster = process.argv.includes('--poster');
  const profile = mkdtempSync(join(tmpdir(), 'just-type-poster-'));
  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--hide-scrollbars', '--allow-file-access-from-files', 'about:blank',
  ], { stdio: 'ignore' });
  const server = onlyPoster ? null : spawn(process.execPath, [join(root, 'scripts/serve.mjs')], {
    env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
  });

  try {
    let target = null;
    for (let i = 0; i < 50 && !target; i++) {
      await sleep(200);
      try {
        const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
        target = list.find((t) => t.type === 'page');
      } catch { /* Chrome ยังเปิดไม่เสร็จ */ }
    }
    if (!target) throw new Error('เชื่อมต่อ Chrome ไม่ได้');

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve);
      socket.addEventListener('error', reject);
    });
    const page = new Page(socket);
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });

    if (!onlyPoster) await captureScreens(page);

    // A4 ที่ 300 dpi
    await page.size(794, 1123, 3.125);
    await page.open(pathToFileURL(join(posterDir, 'poster.html')).href);
    const bottom = await page.run(`document.querySelector('footer').getBoundingClientRect().bottom`);
    console.log(`footer สิ้นสุดที่ ${Math.round(bottom)}px จาก 1123px`);
    if (bottom > 1123 - 20) console.warn('คำเตือน: เนื้อหาล้นหน้า A4');
    await page.shot(join(posterDir, 'poster.jpg'), 'jpeg');
    socket.close();
  } finally {
    server?.kill();
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
