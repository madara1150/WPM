// แกนการพิมพ์: ไม่แตะ DOM และรับเวลาจากผู้เรียก เพื่อให้ทดสอบบน Node ได้
// ทำงานระดับ code point เพราะภาษาไทยพิมพ์สระ/วรรณยุกต์ทีละปุ่ม

export const FAIL_MODES = ['off', 'strict', 'death'];

// แตกข้อความเป็นกลุ่มตัวอักษรที่ต้องวาดติดกัน (พยัญชนะ + สระบน/ล่าง + วรรณยุกต์ + ำ)
export function clusters(text) {
  return text.match(/\P{M}[\p{M}ำ]*|\p{M}+/gu) ?? [];
}

// เทียบค่าก่อน/หลังของช่อง input แล้วแปลงเป็นจำนวนการลบ + ตัวอักษรใหม่
export function diffInput(prev, next) {
  const a = Array.from(prev);
  const b = Array.from(next);
  let same = 0;
  while (same < a.length && same < b.length && a[same] === b[same]) same++;
  return { deletes: a.length - same, inserts: b.slice(same) };
}

export class TypingSession {
  constructor({ text, mode = 'words', duration = 0, failMode = 'off' }) {
    this.target = Array.from(text);
    this.mode = mode;
    this.duration = duration;
    this.failMode = failMode;
    this.typed = [];
    this.startedAt = null;
    this.endedAt = null;
    this.failed = false;
    this.netCorrect = 0;
    this.totalKeys = 0;
    this.correctKeys = 0;
    this.wrongKeys = 0;
    this.backspaces = 0;
    this.rawBySec = [];
    this.errBySec = [];
    this.progress = [];
    this.keyHits = {};
    this.keyMisses = {};
  }

  get pos() { return this.typed.length; }
  get started() { return this.startedAt !== null; }
  get finished() { return this.endedAt !== null; }

  elapsed(t) {
    if (!this.started) return 0;
    const ms = (this.endedAt ?? t) - this.startedAt;
    return this.mode === 'time' ? Math.min(ms, this.duration * 1000) : ms;
  }

  remaining(t) {
    return Math.max(0, this.duration * 1000 - this.elapsed(t));
  }

  append(text) {
    this.target.push(...Array.from(text));
  }

  #bump(list, t, amount = 1) {
    const sec = Math.floor((t - this.startedAt) / 1000);
    while (list.length <= sec) list.push(0);
    list[sec] += amount;
  }

  #mark(t) {
    const sec = Math.floor((t - this.startedAt) / 1000);
    const last = this.progress.at(-1) ?? 0;
    while (this.progress.length <= sec) this.progress.push(last);
    this.progress[sec] = this.netCorrect;
  }

  #key(expected, ok, t) {
    this.totalKeys++;
    this.#bump(this.rawBySec, t);
    this.#bump(this.errBySec, t, ok ? 0 : 1);
    if (ok) this.correctKeys++;
    else this.wrongKeys++;
    if (expected) {
      const bucket = ok ? this.keyHits : this.keyMisses;
      bucket[expected] = (bucket[expected] ?? 0) + 1;
    }
  }

  #atWordStart() {
    return this.pos === 0 || this.target[this.pos - 1] === ' ';
  }

  #skipWord(t) {
    while (this.pos < this.target.length && this.target[this.pos] !== ' ') {
      this.typed.push({ ch: null, ok: false });
    }
    if (this.pos < this.target.length) {
      this.typed.push({ ch: ' ', ok: true });
      this.netCorrect++;
    }
    this.#mark(t);
    this.#finishIfDone(t);
  }

  #finishIfDone(t) {
    if (this.pos >= this.target.length && this.mode !== 'time') this.finish(t);
  }

  type(ch, t) {
    if (this.finished || this.pos >= this.target.length) return { kind: 'ignored' };
    if (!this.started) {
      // กดเว้นวรรคก่อนเริ่มไม่นับ ป้องกันนาฬิกาเดินโดยไม่ตั้งใจ
      if (ch === ' ') return { kind: 'ignored' };
      this.startedAt = t;
    }

    const expected = this.target[this.pos];

    if (ch === ' ' && expected !== ' ') {
      if (this.#atWordStart()) return { kind: 'ignored' };
      this.#key(null, false, t);
      if (this.failMode === 'strict') return { kind: 'blocked' };
      if (this.failMode === 'death') {
        this.failed = true;
        this.finish(t);
        return { kind: 'died' };
      }
      this.#skipWord(t);
      return { kind: 'skipped' };
    }

    const ok = ch === expected;
    this.#key(expected, ok, t);
    if (!ok && this.failMode === 'strict') return { kind: 'blocked', expected };

    this.typed.push({ ch, ok });
    if (ok) this.netCorrect++;
    this.#mark(t);

    if (!ok && this.failMode === 'death') {
      this.failed = true;
      this.finish(t);
      return { kind: 'died', expected };
    }
    this.#finishIfDone(t);
    return { kind: ok ? 'correct' : 'wrong', expected };
  }

  backspace() {
    if (this.finished || this.pos === 0) return false;
    this.backspaces++;
    const drop = () => {
      const entry = this.typed.pop();
      if (entry.ok) this.netCorrect--;
      return entry;
    };
    const entry = drop();
    // ลบย้อนข้ามคำที่กดข้าม: เอาตำแหน่งที่ข้ามออกทีเดียว
    if (entry.ch === ' ' && this.typed.at(-1)?.ch === null) {
      while (this.typed.at(-1)?.ch === null) drop();
    }
    return true;
  }

  finish(t) {
    if (this.finished) return;
    this.endedAt = t;
  }
}
