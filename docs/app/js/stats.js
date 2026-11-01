// ค่ามาตรฐาน: 1 คำ = 5 ตัวอักษร
export const wpm = (chars, ms) => (ms > 0 ? chars / 5 / (ms / 60000) : 0);
export const cpm = (chars, ms) => (ms > 0 ? chars / (ms / 60000) : 0);

// ค่าอ้างอิงจาก README ของโปรเจกต์ต้นฉบับ
export const THAI_AVERAGE_CPM = 240;

export function accuracy(correct, total) {
  return total > 0 ? (correct / total) * 100 : 100;
}

// ความสม่ำเสมอ: ยิ่งความเร็วแต่ละวินาทีแกว่งน้อย ค่ายิ่งสูง
export function consistency(perSecond) {
  if (perSecond.length < 2) return 100;
  const mean = perSecond.reduce((a, b) => a + b, 0) / perSecond.length;
  if (mean === 0) return 0;
  const variance = perSecond.reduce((a, b) => a + (b - mean) ** 2, 0) / perSecond.length;
  return Math.max(0, Math.min(100, 100 * (1 - Math.sqrt(variance) / mean)));
}

const RANKS = [
  [0, 'เต่าน้อย', 'จิ้มทีละปุ่ม แต่ทุกคนเริ่มจากตรงนี้'],
  [25, 'นักหัดพิมพ์', 'เริ่มจำตำแหน่งแป้นได้แล้ว'],
  [40, 'นักพิมพ์ทั่วไป', 'เร็วเท่าคนใช้คอมประจำ'],
  [55, 'มือคล่อง', 'ไม่ต้องก้มดูแป้นแล้ว'],
  [70, 'นักพิมพ์สัมผัส', 'นิ้วรู้ทางเอง'],
  [90, 'จอมพลังแป้น', 'เร็วกว่าคนส่วนใหญ่มาก'],
  [115, 'พายุตัวอักษร', 'คีย์บอร์ดเริ่มร้อน'],
  [140, 'ตำนานแป้นพิมพ์', 'มนุษย์ส่วนน้อยที่ไปถึงจุดนี้'],
];

export function rankFor(value) {
  let index = 0;
  RANKS.forEach(([min], i) => { if (value >= min) index = i; });
  const [min, name, note] = RANKS[index];
  const next = RANKS[index + 1];
  return { level: index + 1, min, name, note, next: next ? { min: next[0], name: next[1] } : null };
}

// กราฟรายวินาที ใช้ค่าเฉลี่ยสะสมเพื่อให้เส้นอ่านง่ายกว่าค่าดิบ
export function buildSeries(session, ms) {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  const series = [];
  let raw = 0;
  let lastProgress = 0;
  for (let i = 0; i < seconds; i++) {
    raw += session.rawBySec[i] ?? 0;
    lastProgress = session.progress[i] ?? lastProgress;
    const at = Math.min((i + 1) * 1000, ms);
    series.push({
      t: i + 1,
      wpm: wpm(lastProgress, at),
      raw: wpm(raw, at),
      err: session.errBySec[i] ?? 0,
    });
  }
  return series;
}

export function fullProgress(session, ms) {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  const out = [];
  let last = 0;
  for (let i = 0; i < seconds; i++) {
    last = session.progress[i] ?? last;
    out.push(last);
  }
  return out;
}

export function summarize(session, t) {
  const ms = session.elapsed(t);
  const perSecond = [];
  for (let i = 0; i < Math.max(1, Math.floor(ms / 1000)); i++) perSecond.push(session.rawBySec[i] ?? 0);
  const missed = session.typed.filter((e) => e.ch === null).length;
  const value = wpm(session.netCorrect, ms);
  return {
    wpm: value,
    raw: wpm(session.totalKeys, ms),
    cpm: cpm(session.netCorrect, ms),
    acc: accuracy(session.correctKeys, session.totalKeys),
    consistency: consistency(perSecond),
    correct: session.netCorrect,
    errors: session.wrongKeys,
    missed,
    backspaces: session.backspaces,
    ms,
    failed: session.failed,
    series: buildSeries(session, ms),
    progress: fullProgress(session, ms),
    keyHits: session.keyHits,
    keyMisses: session.keyMisses,
    rank: rankFor(value),
    vsThai: cpm(session.netCorrect, ms) / THAI_AVERAGE_CPM,
  };
}

// ตำแหน่งของคู่แข่งเงาที่เวลา ms โดยไล่ระหว่างวินาทีให้ลื่น
export function ghostPosition(progress, ms) {
  if (!progress?.length) return 0;
  const exact = ms / 1000;
  const index = Math.floor(exact);
  if (index >= progress.length) return progress.at(-1);
  const before = index === 0 ? 0 : progress[index - 1];
  return before + (progress[index] - before) * (exact - index);
}
