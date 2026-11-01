import { localDateKey } from './textgen.js';

const KEY = 'justtype:v1';
const HISTORY_LIMIT = 500;

export const DEFAULT_SETTINGS = {
  mode: 'time',
  time: 30,
  words: 25,
  lang: 'th',
  difficulty: 'easy',
  failMode: 'off',
  sound: 'off',
  keyboard: true,
  ghost: true,
  caret: 'bar',
  size: 'm',
  theme: null,
};

export function emptyState() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    history: [],
    bests: {},
    keyStats: {},
    rainBest: 0,
    rainGames: 0,
    earned: {},
  };
}

export function createStore(storage) {
  let state = emptyState();
  try {
    const raw = storage?.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = { ...state, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } };
    }
  } catch { /* ข้อมูลเสียหรือเบราว์เซอร์บล็อก storage: เริ่มใหม่ในหน่วยความจำ */ }

  return {
    get state() { return state; },
    save() {
      try { storage?.setItem(KEY, JSON.stringify(state)); } catch { /* เล่นต่อได้แม้บันทึกไม่ได้ */ }
    },
    reset() {
      const { settings } = state;
      state = { ...emptyState(), settings };
      this.save();
    },
    replace(next) {
      const base = emptyState();
      state = { ...base, ...next, settings: { ...DEFAULT_SETTINGS, ...next.settings } };
      this.save();
    },
  };
}

export function configKey({ mode, param, lang, difficulty }) {
  return [mode, param, lang, difficulty].join(':');
}

export function recordResult(state, config, result) {
  const key = configKey(config);
  const entry = {
    at: Date.now(),
    wpm: result.wpm,
    raw: result.raw,
    acc: result.acc,
    con: result.consistency,
    secs: result.ms / 1000,
    lang: config.lang,
    mode: config.mode,
    param: config.param,
    diff: config.difficulty,
  };
  state.history.push(entry);
  if (state.history.length > HISTORY_LIMIT) state.history.splice(0, state.history.length - HISTORY_LIMIT);

  const stats = (state.keyStats[config.lang] ??= {});
  for (const [ch, n] of Object.entries(result.keyHits)) (stats[ch] ??= { hit: 0, miss: 0 }).hit += n;
  for (const [ch, n] of Object.entries(result.keyMisses)) (stats[ch] ??= { hit: 0, miss: 0 }).miss += n;

  const previous = state.bests[key];
  const isBest = !previous || result.wpm > previous.wpm;
  if (isBest) {
    state.bests[key] = { wpm: result.wpm, acc: result.acc, at: entry.at, progress: result.progress };
  }
  return { entry, isBest, hadPrevious: Boolean(previous), previous };
}

export function practiceDays(history) {
  return new Set(history.map((h) => localDateKey(new Date(h.at))));
}

export function streak(history, today = new Date()) {
  const days = practiceDays(history);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // ถ้าวันนี้ยังไม่ได้เล่น ให้นับต่อจากเมื่อวาน สตรีคยังไม่ขาด
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDateKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export const ACHIEVEMENTS = [
  { id: 'first', name: 'ก้าวแรก', note: 'พิมพ์จบครั้งแรก', test: (s) => s.history.length >= 1 },
  { id: 'wpm40', name: 'พ้นเต่า', note: 'ทำได้ 40 WPM', test: (s, r) => r?.wpm >= 40 },
  { id: 'wpm60', name: 'นิ้วไว', note: 'ทำได้ 60 WPM', test: (s, r) => r?.wpm >= 60 },
  { id: 'wpm80', name: 'แป้นลุกเป็นไฟ', note: 'ทำได้ 80 WPM', test: (s, r) => r?.wpm >= 80 },
  { id: 'wpm100', name: 'สามหลัก', note: 'ทำได้ 100 WPM', test: (s, r) => r?.wpm >= 100 },
  { id: 'perfect', name: 'ไร้ที่ติ', note: 'แม่นยำ 100% ในการทดสอบ 30 วินาทีขึ้นไป', test: (s, r) => r?.acc === 100 && r?.ms >= 30000 },
  { id: 'steady', name: 'จังหวะนิ่ง', note: 'ความสม่ำเสมอ 85% ขึ้นไป', test: (s, r) => r?.consistency >= 85 && r?.ms >= 15000 },
  { id: 'thai', name: 'ลูกหลานพ่อขุนราม', note: 'พิมพ์ภาษาไทยครบ 10 ครั้ง', test: (s) => s.history.filter((h) => h.lang === 'th').length >= 10 },
  { id: 'coder', name: 'โปรแกรมเมอร์', note: 'พิมพ์โค้ดภาษา C จบ 1 ครั้ง', test: (s) => s.history.some((h) => h.lang === 'c') },
  { id: 'daily', name: 'มาตามนัด', note: 'เล่นโจทย์ประจำวัน', test: (s) => s.history.some((h) => h.mode === 'daily') },
  { id: 'streak3', name: 'ติดลม', note: 'ฝึกติดกัน 3 วัน', test: (s) => streak(s.history) >= 3 },
  { id: 'streak7', name: 'ครบสัปดาห์', note: 'ฝึกติดกัน 7 วัน', test: (s) => streak(s.history) >= 7 },
  { id: 'tests50', name: 'สายอึด', note: 'พิมพ์จบครบ 50 ครั้ง', test: (s) => s.history.length >= 50 },
  { id: 'rain', name: 'ผู้กล้าฝ่าฝน', note: 'ทำคะแนนฝนคำ 1,000 แต้ม', test: (s) => s.rainBest >= 1000 },
];

export function checkAchievements(state, result) {
  const fresh = [];
  for (const item of ACHIEVEMENTS) {
    if (!state.earned[item.id] && item.test(state, result)) {
      state.earned[item.id] = Date.now();
      fresh.push(item);
    }
  }
  return fresh;
}
