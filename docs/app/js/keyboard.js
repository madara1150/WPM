// ผังแป้นพิมพ์ QWERTY และเกษมณี เรียงตามปุ่มจริง
const LAYOUTS = {
  en: {
    base: ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'],
    shift: ['~!@#$%^&*()_+', 'QWERTYUIOP{}|', 'ASDFGHJKL:"', 'ZXCVBNM<>?'],
  },
  th: {
    base: ['_ๅ/-ภถุึคตจขช', 'ๆไำพะัีรนยบลฃ', 'ฟหกดเ้่าสวง', 'ผปแอิืทมใฝ'],
    shift: ['%+๑๒๓๔ู฿๕๖๗๘๙', '๐"ฎฑธํ๊ณฯญฐ,ฅ', 'ฤฆฏโฌ็๋ษศซ.', '()ฉฮฺ์?ฒฬฦ'],
  },
};

const THUMB = 8;
const FINGER_NAMES = ['นิ้วก้อยซ้าย', 'นิ้วนางซ้าย', 'นิ้วกลางซ้าย', 'นิ้วชี้ซ้าย', 'นิ้วชี้ขวา', 'นิ้วกลางขวา', 'นิ้วนางขวา', 'นิ้วก้อยขวา', 'นิ้วโป้ง'];
const FINGERS = [
  [0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7],
];
const EDGES = [
  [null, ['⌫', 'wide']],
  [['Tab', 'wide'], null],
  [['Caps', 'wider'], ['Enter', 'wider']],
  [['Shift', 'widest', 'shift-l'], ['Shift', 'widest', 'shift-r']],
];

const isMark = (ch) => /\p{M}/u.test(ch);
export const glyph = (ch) => (isMark(ch) ? `◌${ch}` : ch);
export const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const layoutFor = (lang) => (lang === 'th' ? 'th' : 'en');

function buildIndex(name) {
  const index = new Map();
  const { base, shift } = LAYOUTS[name];
  base.forEach((row, r) => {
    const shifted = Array.from(shift[r]);
    Array.from(row).forEach((ch, c) => {
      const id = `${r}-${c}`;
      index.set(ch, { id, shift: false, finger: FINGERS[r][c] });
      index.set(shifted[c], { id, shift: true, finger: FINGERS[r][c] });
    });
  });
  index.set(' ', { id: 'space', shift: false, finger: THUMB });
  return index;
}

const INDEX = { en: buildIndex('en'), th: buildIndex('th') };

export function locate(ch, lang) {
  return INDEX[layoutFor(lang)].get(ch) ?? null;
}

export function renderKeyboard(el, lang) {
  const name = layoutFor(lang);
  const { base, shift } = LAYOUTS[name];
  const edge = ([label, size, id]) =>
    `<span class="key edge ${size}"${id ? ` data-key="${id}"` : ''}>${label}</span>`;
  const rows = base.map((row, r) => {
    const shifted = Array.from(shift[r]);
    const keys = Array.from(row).map((ch, c) => (
      `<span class="key" data-key="${r}-${c}"><small>${escapeHtml(glyph(shifted[c]))}</small><b>${escapeHtml(glyph(ch))}</b></span>`
    )).join('');
    const [left, right] = EDGES[r];
    return `<div class="key-row">${left ? edge(left) : ''}${keys}${right ? edge(right) : ''}</div>`;
  }).join('');
  el.innerHTML = `${rows}<div class="key-row"><span class="key space" data-key="space"></span></div>`;
  el.dataset.layout = name;
}

export function highlightKey(el, ch, lang) {
  el.querySelectorAll('.is-next').forEach((k) => k.classList.remove('is-next'));
  const found = ch ? locate(ch, lang) : null;
  if (!found) return null;
  el.querySelector(`[data-key="${found.id}"]`)?.classList.add('is-next');
  if (found.shift) {
    // กด Shift ด้วยมืออีกข้างเสมอ
    const side = found.finger <= 3 ? 'shift-r' : 'shift-l';
    el.querySelector(`[data-key="${side}"]`)?.classList.add('is-next');
  }
  return `${FINGER_NAMES[found.finger]}${found.shift ? ' + Shift' : ''}`;
}

// ไล่สีตามอัตราพลาดของแต่ละปุ่มจริง (รวมตัวปกติกับตัว Shift)
export function heatKeyboard(el, lang, stats) {
  const totals = new Map();
  for (const [ch, { hit = 0, miss = 0 }] of Object.entries(stats)) {
    const found = locate(ch, lang);
    if (!found) continue;
    const entry = totals.get(found.id) ?? { hit: 0, miss: 0 };
    entry.hit += hit;
    entry.miss += miss;
    totals.set(found.id, entry);
  }
  for (const [id, { hit, miss }] of totals) {
    const key = el.querySelector(`[data-key="${id}"]`);
    if (!key) continue;
    const rate = miss / (hit + miss || 1);
    key.style.setProperty('--heat', `${Math.round(Math.min(1, rate * 3) * 85)}%`);
    key.classList.add('has-heat');
    key.title = `พิมพ์ ${hit + miss} ครั้ง พลาด ${miss} ครั้ง (${Math.round(rate * 100)}%)`;
  }
}
