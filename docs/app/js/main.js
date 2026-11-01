import { TypingSession, clusters, diffInput } from './engine.js';
import { THAI_AVERAGE_CPM, ghostPosition, summarize, wpm, accuracy } from './stats.js';
import { dailyText, generateDrill, generateWords, localDateKey, pickQuote } from './textgen.js';
import { LANGUAGES } from './words.js';
import { checkAchievements, configKey, createStore, recordResult, streak } from './store.js';
import { escapeHtml, glyph, heatKeyboard, highlightKey, renderKeyboard } from './keyboard.js';
import { lineChart } from './charts.js';
import { burst, playKey, toast } from './fx.js';
import { initRain } from './rainview.js';
import { renderStats, renderSettings } from './panels.js';

const $ = (id) => document.getElementById(id);
const THEME_COLORS = { ember: '#16120f', cmd: '#0c0c0c', midnight: '#0b0d19', paper: '#f6f1e7' };
const SENTINEL = '__';
const MODES = { time: 'เวลา', words: 'จำนวนคำ', quote: 'ข้อความ', daily: 'โจทย์วันนี้', drill: 'ฝึกจุดอ่อน' };
const LEVELS = { easy: 'ง่าย', medium: 'กลาง', hard: 'ยาก' };
const TIME_CHOICES = [15, 30, 60, 120];
const WORD_CHOICES = [10, 25, 50, 100];
const TIME_START_WORDS = 90;

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}

const store = createStore(safeStorage());
const settings = () => store.state.settings;

let session = null;
let currentText = '';
let lastConfig = null;
let ghost = null;
let timer = null;
let resultsAt = 0;
let view = 'type';
let wrongScript = 0;
const ui = { map: [], starts: [], els: [], word: null, offset: 0 };

export function applyAppearance() {
  const s = settings();
  const light = matchMedia('(prefers-color-scheme: light)').matches;
  const theme = s.theme ?? (light ? 'paper' : 'ember');
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.caret = s.caret;
  document.documentElement.dataset.size = s.size;
  document.querySelector('meta[name=theme-color]').content = THEME_COLORS[theme];
}

function segmented(label, options, value, onPick) {
  const group = document.createElement('div');
  group.className = 'seg';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  for (const [key, text] of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-pressed', String(key === value));
    button.addEventListener('click', () => onPick(key));
    group.append(button);
  }
  return group;
}

function renderConfig() {
  const s = settings();
  const host = $('config');
  host.replaceChildren();
  const pick = (field) => (value) => {
    s[field] = value;
    store.save();
    renderConfig();
    newTest();
  };
  host.append(segmented('โหมด', Object.entries(MODES), s.mode, pick('mode')));
  if (s.mode === 'time') {
    host.append(segmented('เวลา', TIME_CHOICES.map((n) => [n, `${n} วิ`]), s.time, pick('time')));
  } else if (s.mode === 'words') {
    host.append(segmented('จำนวนคำ', WORD_CHOICES.map((n) => [n, String(n)]), s.words, pick('words')));
  }
  host.append(segmented('ภาษา', Object.entries(LANGUAGES).map(([k, v]) => [k, v.label]), s.lang, pick('lang')));
  if (s.mode === 'time' || s.mode === 'words') {
    host.append(segmented('ระดับ', Object.entries(LEVELS), s.difficulty, pick('difficulty')));
  }
}

function currentConfig() {
  const s = settings();
  const levelled = s.mode === 'time' || s.mode === 'words';
  const param = { time: s.time, words: s.words, daily: localDateKey() }[s.mode] ?? 0;
  return { mode: s.mode, param, lang: s.lang, difficulty: levelled ? s.difficulty : '-' };
}

function buildText(config) {
  const { mode, lang, difficulty, param } = config;
  if (mode === 'time') return { text: generateWords({ lang, difficulty, count: TIME_START_WORDS }) };
  if (mode === 'words') return { text: generateWords({ lang, difficulty, count: param }) };
  if (mode === 'quote') return { text: pickQuote({ lang, avoid: currentText }) };
  if (mode === 'daily') {
    return { text: dailyText(lang, param), notice: `โจทย์ประจำวันที่ ${param}: ทุกคนได้ข้อความชุดเดียวกัน พิมพ์ซ้ำได้เรื่อยๆ เพื่อทำสถิติของวัน` };
  }
  const drill = generateDrill({ lang, keyStats: store.state.keyStats[lang], count: 30 });
  if (drill.text) return { text: drill.text, notice: `กำลังฝึกปุ่มที่พลาดบ่อย: ${drill.keys.join('  ')}` };
  return {
    text: generateWords({ lang, difficulty: 'easy', count: 30 }),
    notice: 'ยังไม่มีข้อมูลปุ่มที่พลาดพอ รอบนี้จึงเป็นคำทั่วไป เล่นสักสองสามรอบแล้วโหมดนี้จะเลือกคำให้ตรงจุด',
  };
}

function addText(text) {
  const inner = $('text-inner');
  const fragment = document.createDocumentFragment();
  for (const cluster of clusters(text)) {
    if (!ui.word) {
      ui.word = document.createElement('span');
      ui.word.className = 'word';
      fragment.append(ui.word);
    }
    const el = document.createElement('span');
    el.className = 'c';
    el.textContent = cluster;
    ui.word.append(el);
    const index = ui.els.length;
    ui.els.push(el);
    ui.starts.push(ui.offset);
    for (const _ of cluster) ui.map[ui.offset++] = index;
    if (cluster === ' ') ui.word = null;
  }
  inner.append(fragment);
}

function paintCluster(index) {
  const start = ui.starts[index];
  const end = ui.starts[index + 1] ?? session.target.length;
  const entries = session.typed.slice(start, end);
  const el = ui.els[index];
  let state = 'c';
  if (entries.length) {
    const full = entries.length === end - start;
    if (entries.some((e) => e.ch === null)) state = 'c miss';
    else if (entries.some((e) => !e.ok)) state = 'c err';
    else state = full ? 'c ok' : 'c part';
  }
  if (el.className !== state) el.className = state;
}

function paintRange(from, to) {
  const last = session.target.length - 1;
  const a = ui.map[Math.max(0, Math.min(from, last))];
  const b = ui.map[Math.max(0, Math.min(to, last))];
  for (let i = a; i <= b; i++) paintCluster(i);
}

function caretPoint(pos) {
  const clamped = Math.min(pos, ui.map.length - 1);
  const index = ui.map[clamped];
  const el = ui.els[index];
  const word = el.parentElement;
  const past = pos > ui.starts[index] ? el.offsetWidth : 0;
  return { x: word.offsetLeft + el.offsetLeft + past, y: word.offsetTop, h: word.offsetHeight };
}

function placeCaret() {
  const { x, y, h } = caretPoint(session.pos);
  const caret = $('caret');
  caret.style.transform = `translate(${x}px, ${y}px)`;
  caret.style.height = `${h}px`;
  // คงเคอร์เซอร์ไว้บรรทัดที่สอง แล้วเลื่อนข้อความขึ้นแทน
  $('text-inner').style.transform = `translateY(${-Math.max(0, y - h)}px)`;

  const next = session.target[session.pos];
  if (settings().keyboard) {
    $('finger').textContent = highlightKey($('keyboard'), next, settings().lang) ?? '';
  }
}

function placeGhost(now) {
  const el = $('ghost-caret');
  if (!ghost || !session.started) {
    el.hidden = true;
    $('live-ghost').textContent = '';
    return;
  }
  const ahead = ghostPosition(ghost, session.elapsed(now));
  const { x, y, h } = caretPoint(Math.round(ahead));
  el.hidden = false;
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.style.height = `${h}px`;
  const gap = Math.round(session.netCorrect - ahead);
  const live = $('live-ghost');
  live.textContent = gap === 0 ? 'เท่าสถิติ' : `${gap > 0 ? 'นำ' : 'ตาม'}สถิติ ${Math.abs(gap)} ตัว`;
  live.dataset.state = gap >= 0 ? 'ahead' : 'behind';
}

function updateLive(now) {
  const { mode } = session;
  const ms = session.elapsed(now);
  const total = session.target.length;
  if (mode === 'time') {
    $('live-main').textContent = Math.ceil(session.remaining(now) / 1000);
    $('progress').style.transform = `scaleX(${ms / (session.duration * 1000)})`;
  } else {
    const words = currentText.split(' ').length;
    const done = session.target.slice(0, session.pos).filter((ch) => ch === ' ').length;
    $('live-main').textContent = `${done}/${words}`;
    $('progress').style.transform = `scaleX(${session.pos / total})`;
  }
  $('live-wpm').textContent = Math.round(wpm(session.netCorrect, ms));
  $('live-acc').textContent = Math.round(accuracy(session.correctKeys, session.totalKeys));
}

function startClock() {
  document.body.classList.add('is-typing');
  timer = setInterval(() => {
    const now = performance.now();
    updateLive(now);
    placeGhost(now);
    if (session.mode === 'time' && session.remaining(now) <= 0) {
      session.finish(now);
      endTest();
    }
  }, 100);
}

function stopClock() {
  clearInterval(timer);
  timer = null;
  document.body.classList.remove('is-typing');
}

function resetInput() {
  const input = $('input');
  input.value = SENTINEL;
  input.setSelectionRange(SENTINEL.length, SENTINEL.length);
}

function setHint(text = '') {
  $('hint').textContent = text;
}

const isThai = (ch) => /[฀-๿]/.test(ch);
const isLatinLetter = (ch) => /[a-zA-Z]/.test(ch);

function wrongLayout(ch, expected) {
  if (!expected) return false;
  return isThai(expected) ? isLatinLetter(ch) : isThai(ch);
}

function layoutMessage(expected) {
  return isThai(expected)
    ? 'แป้นพิมพ์ยังเป็นภาษาอังกฤษ: สลับเป็นไทยก่อนด้วยปุ่ม ` หรือ Win+Space'
    : 'แป้นพิมพ์ยังเป็นภาษาไทย: สลับเป็นอังกฤษก่อนด้วยปุ่ม ` หรือ Win+Space';
}

function onChar(ch, now) {
  const expected = session.target[session.pos];
  const mismatch = wrongLayout(ch, expected);
  if (mismatch && !session.started) {
    // ไม่เริ่มจับเวลาถ้าเลือกภาษาแป้นพิมพ์ผิด
    setHint(layoutMessage(expected));
    return;
  }
  wrongScript = mismatch ? wrongScript + 1 : 0;
  if (wrongScript >= 3) setHint(layoutMessage(expected));
  else if (!mismatch) setHint();

  const before = session.pos;
  const wasStarted = session.started;
  const outcome = session.type(ch, now);
  if (outcome.kind === 'ignored') return;
  if (!wasStarted) {
    $('stage').classList.add('is-running');
    startClock();
  }
  const good = outcome.kind === 'correct' || outcome.kind === 'skipped';
  playKey(settings().sound, good);
  if (outcome.kind === 'blocked') {
    const caret = $('caret');
    caret.classList.remove('shake');
    void caret.offsetWidth;
    caret.classList.add('shake');
  }
  paintRange(before - 1, session.pos);
}

function maybeExtend() {
  if (session.mode !== 'time' || session.finished) return;
  if (session.target.length - session.pos > 240) return;
  const { lang, difficulty } = lastConfig;
  const more = ` ${generateWords({ lang, difficulty, count: 50 })}`;
  session.append(more);
  addText(more);
}

function afterInput() {
  if (session.finished) {
    endTest();
    return;
  }
  maybeExtend();
  const now = performance.now();
  placeCaret();
  updateLive(now);
  placeGhost(now);
}

function deleteOne() {
  const before = session.pos;
  if (session.backspace()) paintRange(session.pos - 1, before);
}

function deleteWord() {
  if (session.target[session.pos - 1] === ' ') deleteOne();
  while (session.pos > 0 && session.target[session.pos - 1] !== ' ') deleteOne();
}

function onInput(event) {
  if (event.isComposing || !session) return;
  const input = $('input');
  const { deletes, inserts } = diffInput(SENTINEL, input.value);
  resetInput();
  for (let i = 0; i < deletes; i++) deleteOne();
  const now = performance.now();
  for (const ch of inserts) {
    if (session.finished) break;
    onChar(ch, now);
  }
  afterInput();
}

function onKeydown(event) {
  if (event.getModifierState?.('CapsLock') && settings().lang !== 'th') setHint('Caps Lock เปิดอยู่');
  if (event.key === 'Tab') {
    event.preventDefault();
    $('restart').focus();
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    newTest();
    return;
  }
  if (event.key === 'Backspace' && (event.ctrlKey || event.altKey)) {
    event.preventDefault();
    deleteWord();
    afterInput();
    return;
  }
  // ช่องพิมพ์ต้องเก็บเคอร์เซอร์ไว้ท้ายสุดเสมอ
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) event.preventDefault();
  if ((event.ctrlKey || event.metaKey) && ['z', 'y', 'a', 'x', 'v'].includes(event.key.toLowerCase())) event.preventDefault();
}

export function focusTyping() {
  if (view === 'type' && !$('stage').hidden) $('input').focus({ preventScroll: true });
}

function newTest({ text = null } = {}) {
  stopClock();
  const config = currentConfig();
  lastConfig = config;
  const built = text ? { text } : buildText(config);
  currentText = built.text;

  const notice = $('notice');
  notice.textContent = built.notice ?? '';
  notice.hidden = !built.notice;

  session = new TypingSession({
    text: built.text,
    mode: config.mode === 'time' ? 'time' : 'words',
    duration: config.mode === 'time' ? config.param : 0,
    failMode: settings().failMode,
  });
  const best = store.state.bests[configKey(config)];
  ghost = settings().ghost && best?.progress?.length > 1 ? best.progress : null;

  const inner = $('text-inner');
  inner.innerHTML = '<div id="caret" class="caret"></div><div id="ghost-caret" class="ghost-caret" hidden></div>';
  inner.style.transform = 'translateY(0)';
  Object.assign(ui, { map: [], starts: [], els: [], word: null, offset: 0 });
  addText(built.text);

  $('text').dataset.lang = config.lang;
  $('stage').hidden = false;
  $('results').hidden = true;
  $('stage').classList.remove('is-running');
  $('keyboard').hidden = !settings().keyboard;
  $('finger').hidden = !settings().keyboard;
  if (settings().keyboard) renderKeyboard($('keyboard'), config.lang);
  wrongScript = 0;
  setHint();
  $('live-ghost').textContent = '';
  resetInput();
  placeCaret();
  updateLive(performance.now());
  focusTyping();
}

function modeLabel(c) {
  const lang = LANGUAGES[c.lang].label;
  const level = LEVELS[c.difficulty] ? ` · ${LEVELS[c.difficulty]}` : '';
  if (c.mode === 'time') return `${c.param} วินาที · ${lang}${level}`;
  if (c.mode === 'words') return `${c.param} คำ · ${lang}${level}`;
  return `${MODES[c.mode]} · ${lang}`;
}

function endTest() {
  stopClock();
  const now = session.endedAt ?? performance.now();
  const result = summarize(session, now);
  const counted = !result.failed && result.ms >= 3000 && session.totalKeys >= 5;

  let record = null;
  let fresh = [];
  if (counted) {
    record = recordResult(store.state, lastConfig, result);
    fresh = checkAchievements(store.state, result);
    store.save();
  }
  renderResults(result, record, counted);
  renderStreak();
  fresh.forEach((a, i) => setTimeout(() => toast(`ปลดล็อก: ${a.name}`, a.note), 500 + i * 700));
}

function countUp(el, value) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = Math.round(value);
    return;
  }
  const start = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - start) / 600);
    el.textContent = Math.round(value * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function comparison(result) {
  const pct = Math.round(Math.abs(result.vsThai - 1) * 100);
  if (pct === 0) return `เท่ากับค่าอ้างอิงของคนไทยที่ ${THAI_AVERAGE_CPM} ตัวอักษรต่อนาที`;
  return `${result.vsThai > 1 ? 'เร็วกว่า' : 'ช้ากว่า'}ค่าอ้างอิงของคนไทย (${THAI_AVERAGE_CPM} ตัวอักษรต่อนาที) ${pct}%`;
}

function renderResults(result, record, counted) {
  const box = $('results');
  const secs = result.ms / 1000;
  const { rank } = result;
  const isBest = record?.isBest && record.hadPrevious;
  const gain = isBest ? result.wpm - record.previous.wpm : 0;
  const worst = Object.entries(result.keyMisses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([ch, n]) => `<li><kbd>${ch === ' ' ? 'เว้นวรรค' : escapeHtml(glyph(ch))}</kbd> ${n} ครั้ง</li>`)
    .join('');
  const nextRank = rank.next ? `อีก ${Math.max(1, Math.ceil(rank.next.min - result.wpm))} WPM ถึงขั้น ${rank.next.name}` : 'ขั้นสูงสุดแล้ว';

  box.innerHTML = `
    <div class="result-hero">
      <div class="big">
        <span class="big-num" id="big-num">0</span>
        <span class="big-unit">WPM</span>
      </div>
      <div class="verdict">
        ${result.failed ? '<p class="tag tag-bad">จบเพราะพิมพ์ผิด (Sudden Death)</p>' : ''}
        ${isBest ? `<p class="tag">สถิติใหม่ +${gain.toFixed(1)} WPM</p>` : ''}
        ${!counted && !result.failed ? '<p class="tag tag-quiet">รอบนี้สั้นเกินไป ไม่บันทึกสถิติ</p>' : ''}
        <h2>ขั้น ${rank.level}: ${rank.name}</h2>
        <p>${rank.note}</p>
        <p class="sub">${nextRank}</p>
      </div>
    </div>
    <dl class="result-grid">
      <div><dt>ความแม่นยำ</dt><dd>${result.acc.toFixed(1)}%</dd></div>
      <div><dt>ตัวอักษร/นาที</dt><dd>${Math.round(result.cpm)}</dd></div>
      <div><dt>Raw WPM</dt><dd>${Math.round(result.raw)}</dd></div>
      <div><dt>ความสม่ำเสมอ</dt><dd>${Math.round(result.consistency)}%</dd></div>
      <div><dt>ปุ่มที่ผิด</dt><dd>${result.errors}</dd></div>
      <div><dt>เวลา</dt><dd>${secs.toFixed(1)} วิ</dd></div>
    </dl>
    <p class="result-compare">${comparison(result)} · ${modeLabel(lastConfig)}</p>
    <div class="panel"><h3>ความเร็วตลอดการทดสอบ</h3><div id="result-chart" class="chart"></div></div>
    <div class="panel">
      <h3>ปุ่มที่พลาดในรอบนี้</h3>
      <div id="result-keyboard" class="keyboard heat"></div>
      <div class="heat-legend"><span>พลาดน้อย</span><i></i><span>พลาดบ่อย</span></div>
      ${worst ? `<ul class="worst">${worst}</ul>` : '<p class="sub">ไม่พลาดเลยสักปุ่ม</p>'}
    </div>
    <div class="result-actions">
      <button id="again" class="btn" type="button">รอบต่อไป <kbd>Enter</kbd></button>
      <button id="repeat" class="ghost-btn" type="button">พิมพ์ข้อความเดิม</button>
      <button id="drill" class="ghost-btn" type="button">ฝึกจุดอ่อน</button>
      <button id="copy" class="ghost-btn" type="button">คัดลอกผล</button>
    </div>`;

  $('stage').hidden = true;
  box.hidden = false;
  scrollTo({ top: 0 });
  resultsAt = performance.now();
  document.activeElement?.blur?.();

  countUp($('big-num'), result.wpm);
  lineChart($('result-chart'), {
    points: result.series.map((p) => ({ ...p, label: p.t })),
    series: [
      { key: 'wpm', label: 'WPM', className: 's-main' },
      { key: 'raw', label: 'Raw', className: 's-sub' },
    ],
    marks: 'err',
    marksLabel: 'พิมพ์ผิด',
    xTitle: 'วินาทีที่ ',
  });

  const stats = {};
  for (const [ch, n] of Object.entries(result.keyHits)) (stats[ch] ??= {}).hit = n;
  for (const [ch, n] of Object.entries(result.keyMisses)) (stats[ch] ??= {}).miss = n;
  renderKeyboard($('result-keyboard'), lastConfig.lang);
  heatKeyboard($('result-keyboard'), lastConfig.lang, stats);

  $('again').addEventListener('click', () => newTest());
  $('repeat').addEventListener('click', () => newTest({ text: currentText }));
  $('drill').addEventListener('click', () => {
    settings().mode = 'drill';
    store.save();
    renderConfig();
    newTest();
  });
  $('copy').addEventListener('click', async () => {
    const line = `JUST TYPE ${Math.round(result.wpm)} WPM · แม่นยำ ${result.acc.toFixed(1)}% · ${modeLabel(lastConfig)} · ขั้น ${rank.name}`;
    try {
      await navigator.clipboard.writeText(line);
      toast('คัดลอกผลแล้ว');
    } catch {
      toast('คัดลอกไม่สำเร็จ', line);
    }
  });

  if (isBest) {
    const box2 = $('big-num').getBoundingClientRect();
    burst(box2.left + box2.width / 2, box2.top + box2.height / 2, 60);
  }
}

function renderStreak() {
  const days = streak(store.state.history);
  $('streak').textContent = days ? `ฝึกติดกัน ${days} วัน` : '';
}

function showView(name) {
  view = ['type', 'rain', 'stats', 'settings'].includes(name) ? name : 'type';
  if (view !== 'type' && timer) stopClock();
  for (const key of ['type', 'rain', 'stats', 'settings']) $(`view-${key}`).hidden = key !== view;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  rain.leave();
  scrollTo({ top: 0 });
  if (view === 'type') newTest();
  if (view === 'rain') rain.enter();
  if (view === 'stats') renderStats($('view-stats'), store);
  if (view === 'settings') {
    renderSettings($('view-settings'), store, {
      segmented,
      onChange() {
        store.save();
        applyAppearance();
      },
    });
  }
}

const rain = initRain($('view-rain'), { store, onAchievement: renderStreak });

$('input').addEventListener('input', onInput);
$('input').addEventListener('compositionend', onInput);
$('input').addEventListener('keydown', onKeydown);
$('restart').addEventListener('click', () => newTest());
$('focus-cover').addEventListener('click', focusTyping);
$('text-wrap').addEventListener('click', focusTyping);

// พิมพ์ได้ทันทีแม้โฟกัสหลุด และรับ Enter หลังจบรอบ
document.addEventListener('keydown', (event) => {
  if (view !== 'type') return;
  if (!$('results').hidden) {
    if (event.key === 'Enter' && performance.now() - resultsAt > 500 && !event.target.closest?.('button')) newTest();
    return;
  }
  if (event.target === $('input') || event.target.closest?.('button, a, input, select')) return;
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) focusTyping();
});

addEventListener('resize', () => {
  if (session && !$('stage').hidden && view === 'type') placeCaret();
});
addEventListener('hashchange', () => showView(location.hash.slice(1)));
document.fonts?.ready.then(() => {
  if (session && !$('stage').hidden) placeCaret();
});

applyAppearance();
renderConfig();
renderStreak();
showView(location.hash.slice(1));
