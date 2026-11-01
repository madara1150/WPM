import { RainGame } from './rain.js';
import { clusters, diffInput } from './engine.js';
import { wpm } from './stats.js';
import { LANGUAGES } from './words.js';
import { checkAchievements } from './store.js';
import { burst, playKey, toast } from './fx.js';

const SENTINEL = '__';
const MAX_LENGTH = 13;
const KIND_NOTE = { gold: 'ทอง', ice: 'น้ำแข็ง' };

export function initRain(root, { store, onAchievement }) {
  root.innerHTML = `
    <div class="rain-head">
      <div class="rain-stat"><span>คะแนน</span><b id="rain-score">0</b></div>
      <div class="rain-stat"><span>ด่าน</span><b id="rain-level">1</b></div>
      <div class="rain-stat"><span>คอมโบ</span><b id="rain-combo">x1</b></div>
      <div class="rain-stat"><span>ชีวิต</span><b id="rain-lives" aria-label="จำนวนชีวิต"></b></div>
    </div>
    <div id="rain-area" class="rain-area">
      <input id="rain-input" class="ghost-input" type="text" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="ช่องพิมพ์ของเกมฝนคำ">
      <div id="rain-items"></div>
      <div id="rain-panel" class="rain-panel"></div>
    </div>
    <p class="sub rain-foot"><kbd>⌫</kbd> ปล่อยคำที่ล็อกไว้ · <span class="pill gold">คำทอง</span> เพิ่มชีวิต · <span class="pill ice">คำน้ำแข็ง</span> ทำให้ฝนช้าลง 6 วินาที</p>`;

  const $ = (id) => root.querySelector(`#${id}`);
  const input = $('rain-input');
  const area = $('rain-area');
  const layer = $('rain-items');
  const nodes = new Map();
  let game = null;
  let raf = 0;
  let last = 0;
  let paused = false;

  const panel = (html) => {
    $('rain-panel').innerHTML = html;
    $('rain-panel').hidden = !html;
    $('rain-panel').querySelector('[data-start]')?.addEventListener('click', start);
    $('rain-panel').querySelector('[data-resume]')?.addEventListener('click', resume);
  };

  function hud() {
    $('rain-score').textContent = (game?.score ?? 0).toLocaleString('en-US');
    $('rain-level').textContent = game?.level ?? 1;
    $('rain-combo').textContent = `x${game?.multiplier ?? 1}`;
    $('rain-lives').textContent = '■'.repeat(Math.max(0, game?.lives ?? 3));
  }

  function intro() {
    const lang = store.state.settings.lang;
    panel(`
      <h2>ฝนคำ</h2>
      <p>พิมพ์คำให้ทันก่อนตกถึงพื้น พลาดสามคำเกมจบ พิมพ์ต่อเนื่องไม่ผิดเพื่อคูณคะแนน</p>
      <p class="sub">ภาษา: ${LANGUAGES[lang].label} (เปลี่ยนได้ที่หน้าพิมพ์) · สถิติสูงสุด ${store.state.rainBest.toLocaleString('en-US')}</p>
      <button class="btn" data-start type="button">เริ่มเกม</button>`);
  }

  function clearItems() {
    layer.replaceChildren();
    nodes.clear();
  }

  function start() {
    cancelAnimationFrame(raf);
    clearItems();
    const lang = store.state.settings.lang;
    const { easy, medium } = LANGUAGES[lang].words;
    const words = [...new Set([...easy, ...medium])].filter((w) => Array.from(w).length <= MAX_LENGTH);
    game = new RainGame({ words });
    paused = false;
    panel('');
    hud();
    input.value = SENTINEL;
    input.focus({ preventScroll: true });
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function nodeFor(item) {
    let node = nodes.get(item.id);
    if (node) return node;
    const el = document.createElement('div');
    el.className = `drop ${item.kind}`;
    el.style.left = `${item.x * 100}%`;
    el.setAttribute('aria-label', KIND_NOTE[item.kind] ?? 'คำ');
    const parts = clusters(item.word).map((text) => {
      const span = document.createElement('span');
      span.textContent = text;
      el.append(span);
      return { span, size: Array.from(text).length };
    });
    layer.append(el);
    node = { el, parts, painted: -1 };
    nodes.set(item.id, node);
    return node;
  }

  function paint() {
    const height = area.clientHeight - 44;
    const alive = new Set();
    for (const item of game.items) {
      alive.add(item.id);
      const node = nodeFor(item);
      node.el.style.transform = `translateY(${item.y * height}px)`;
      node.el.classList.toggle('locked', game.target === item.id);
      if (node.painted !== item.typed) {
        let seen = 0;
        for (const part of node.parts) {
          seen += part.size;
          part.span.classList.toggle('done', seen <= item.typed);
        }
        node.painted = item.typed;
      }
    }
    for (const [id, node] of nodes) {
      if (!alive.has(id)) {
        node.el.remove();
        nodes.delete(id);
      }
    }
    area.classList.toggle('is-frozen', game.slowFor > 0);
  }

  function gameOver() {
    cancelAnimationFrame(raf);
    const state = store.state;
    const best = game.score > state.rainBest;
    if (best) state.rainBest = game.score;
    state.rainGames++;
    const fresh = checkAchievements(state, null);
    store.save();
    onAchievement();
    fresh.forEach((a) => toast(`ปลดล็อก: ${a.name}`, a.note));
    input.blur();
    panel(`
      <h2>${best ? 'สถิติใหม่' : 'เกมจบ'}</h2>
      <p class="rain-final">${game.score.toLocaleString('en-US')} <small>แต้ม</small></p>
      <p class="sub">เคลียร์ ${game.cleared} คำ · คอมโบสูงสุด ${game.bestCombo} · ด่าน ${game.level} · ประมาณ ${Math.round(wpm(game.chars, game.time * 1000))} WPM</p>
      <button class="btn" data-start type="button">เล่นอีกครั้ง</button>`);
    if (best) {
      const box = area.getBoundingClientRect();
      burst(box.left + box.width / 2, box.top + box.height / 2, 60);
    }
  }

  function loop(now) {
    if (paused || !game) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const event of game.step(dt)) {
      if (event.kind === 'lost') {
        area.classList.remove('hit');
        void area.offsetWidth;
        area.classList.add('hit');
      }
    }
    hud();
    if (game.over) {
      paint();
      gameOver();
      return;
    }
    paint();
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    if (!game || game.over || paused) return;
    paused = true;
    cancelAnimationFrame(raf);
    panel('<h2>พักเกม</h2><button class="btn" data-resume type="button">เล่นต่อ</button>');
  }

  function resume() {
    if (!paused) return;
    paused = false;
    panel('');
    input.focus({ preventScroll: true });
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  input.addEventListener('input', (event) => {
    if (event.isComposing || !game) return;
    const { deletes, inserts } = diffInput(SENTINEL, input.value);
    input.value = SENTINEL;
    if (deletes) game.release();
    for (const ch of inserts) {
      const outcome = game.input(ch);
      playKey(store.state.settings.sound, outcome.kind !== 'miss');
      if (outcome.kind === 'cleared') {
        const node = nodes.get(outcome.item.id);
        if (node) {
          const box = node.el.getBoundingClientRect();
          burst(box.left + box.width / 2, box.top + box.height / 2, 16);
        }
      }
    }
    hud();
    paint();
  });
  input.addEventListener('blur', () => { if (document.hasFocus()) setTimeout(pause, 120); else pause(); });
  input.addEventListener('keydown', (event) => { if (event.key === 'Tab') event.preventDefault(); });
  area.addEventListener('click', (event) => {
    if (game && !game.over && !paused && !event.target.closest('button')) input.focus({ preventScroll: true });
  });

  hud();
  intro();

  return {
    enter() {
      if (!game || game.over) {
        game = null;
        clearItems();
        hud();
        intro();
      }
    },
    leave() { pause(); },
  };
}
