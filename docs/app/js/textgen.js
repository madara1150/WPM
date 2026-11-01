import { LANGUAGES } from './words.js';

export function hashString(text) {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// RNG แบบกำหนด seed ได้ เพื่อให้ Daily Challenge ได้ข้อความเดียวกันทุกเครื่อง
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

function decorate(word, lang, rng) {
  if (lang === 'c') return word;
  const roll = rng();
  if (roll < 0.1) {
    const number = String(Math.floor(rng() * 9000) + 10);
    // แป้นเกษมณีมีเลขไทยอยู่ที่ Shift แต่ไม่มีเลขอารบิก
    return lang === 'th' ? number.replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[d]) : number;
  }
  if (lang === 'th') return roll < 0.2 ? `(${word})` : word;
  let out = roll < 0.35 ? word[0].toUpperCase() + word.slice(1) : word;
  if (rng() < 0.28) out += pick([',', '.', ';', ':', '!', '?'], rng);
  return out;
}

export function generateWords({ lang, difficulty, count, rng = Math.random }) {
  const pack = LANGUAGES[lang].words;
  const base = pack[difficulty];
  const out = [];
  while (out.length < count) {
    // ระดับยาก/ปานกลางแทรกคำง่ายบ้าง ไม่ให้ข้อความเป็นคำยาวล้วน
    const source = difficulty !== 'easy' && rng() < 0.2 ? pack.easy : base;
    let word = pick(source, rng);
    if (word === out.at(-1)) continue;
    if (difficulty === 'hard') word = decorate(word, lang, rng);
    out.push(word);
  }
  return out.join(' ');
}

export function pickQuote({ lang, rng = Math.random, avoid = '' }) {
  const quotes = LANGUAGES[lang].quotes;
  let quote = pick(quotes, rng);
  if (quote === avoid && quotes.length > 1) quote = pick(quotes.filter((q) => q !== avoid), rng);
  return quote;
}

// ตัวอักษรที่พลาดบ่อย: ต้องมีสถิติพอ และเรียงจากอัตราพลาดมากไปน้อย
export function weakKeys(keyStats = {}, limit = 6) {
  return Object.entries(keyStats)
    .map(([ch, { hit = 0, miss = 0 }]) => ({ ch, hit, miss, rate: miss / (hit + miss || 1) }))
    .filter((k) => k.ch !== ' ' && k.miss >= 2)
    .sort((a, b) => b.rate - a.rate || b.miss - a.miss)
    .slice(0, limit);
}

export function generateDrill({ lang, keyStats, count, rng = Math.random }) {
  const weak = weakKeys(keyStats);
  if (!weak.length) return { text: null, keys: [] };
  const { easy, medium } = LANGUAGES[lang].words;
  const weights = new Map(weak.map((k) => [k.ch, 1 + k.rate * 4]));
  const pool = [...new Set([...easy, ...medium])]
    .map((word) => ({
      word,
      score: Array.from(word).reduce((sum, ch) => sum + (weights.get(ch) ?? 0), 0),
    }))
    .filter((w) => w.score > 0);
  if (!pool.length) return { text: null, keys: [] };

  const total = pool.reduce((sum, w) => sum + w.score, 0);
  const out = [];
  while (out.length < count) {
    let roll = rng() * total;
    const hit = pool.find((w) => (roll -= w.score) <= 0) ?? pool.at(-1);
    if (pool.length > 1 && hit.word === out.at(-1)) continue;
    out.push(hit.word);
  }
  return { text: out.join(' '), keys: weak.map((k) => k.ch) };
}

export function localDateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dailyText(lang, dateKey) {
  const rng = seededRandom(hashString(`${dateKey}:${lang}`));
  return generateWords({ lang, difficulty: 'medium', count: 40, rng });
}
