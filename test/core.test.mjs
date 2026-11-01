import test from 'node:test';
import assert from 'node:assert/strict';
import { TypingSession, clusters, diffInput } from '../docs/app/js/engine.js';
import { accuracy, consistency, ghostPosition, rankFor, summarize, wpm } from '../docs/app/js/stats.js';
import { dailyText, generateDrill, generateWords, hashString, seededRandom, weakKeys } from '../docs/app/js/textgen.js';
import { LANGUAGES } from '../docs/app/js/words.js';
import { ACHIEVEMENTS, checkAchievements, configKey, createStore, emptyState, recordResult, streak } from '../docs/app/js/store.js';
import { RainGame } from '../docs/app/js/rain.js';

const typeAll = (session, text, step = 100, start = 1000) => {
  let t = start;
  for (const ch of text) {
    session.type(ch, t);
    t += step;
  }
  return t;
};

test('clusters keep Thai marks with their base consonant', () => {
  assert.deepEqual(clusters('น้ำ'), ['น้ำ']);
  assert.deepEqual(clusters('ที่นี่'), ['ที่', 'นี่']);
  assert.deepEqual(clusters('a b'), ['a', ' ', 'b']);
  assert.equal(clusters('กำลังใจ').join(''), 'กำลังใจ');
});

test('diffInput handles typing, deleting and replacing', () => {
  assert.deepEqual(diffInput('ab', 'abc'), { deletes: 0, inserts: ['c'] });
  assert.deepEqual(diffInput('abc', 'ab'), { deletes: 1, inserts: [] });
  assert.deepEqual(diffInput('abc', 'axy'), { deletes: 2, inserts: ['x', 'y'] });
  assert.deepEqual(diffInput('ที', 'ที่'), { deletes: 0, inserts: ['่'] });
});

test('words mode finishes on the last character', () => {
  const s = new TypingSession({ text: 'ab cd', mode: 'words' });
  typeAll(s, 'ab c');
  assert.equal(s.finished, false);
  s.type('d', 2000);
  assert.equal(s.finished, true);
  assert.equal(s.netCorrect, 5);
  assert.equal(s.wrongKeys, 0);
});

test('clock does not start on a leading space', () => {
  const s = new TypingSession({ text: 'ab', mode: 'words' });
  assert.equal(s.type(' ', 10).kind, 'ignored');
  assert.equal(s.started, false);
});

test('wrong key advances and backspace restores the correct count', () => {
  const s = new TypingSession({ text: 'abc', mode: 'words' });
  s.type('x', 0);
  assert.equal(s.pos, 1);
  assert.equal(s.netCorrect, 0);
  s.backspace();
  assert.equal(s.pos, 0);
  s.type('a', 100);
  assert.equal(s.netCorrect, 1);
  assert.equal(s.keyMisses.a, 1);
  assert.equal(s.keyHits.a, 1);
});

test('space skips the rest of a word and backspace undoes it at once', () => {
  const s = new TypingSession({ text: 'hello world', mode: 'words' });
  s.type('h', 0);
  assert.equal(s.type(' ', 100).kind, 'skipped');
  assert.equal(s.pos, 6);
  assert.equal(s.netCorrect, 2);
  assert.equal(s.typed.filter((e) => e.ch === null).length, 4);
  s.backspace();
  assert.equal(s.pos, 1);
  assert.equal(s.netCorrect, 1);
});

test('skipping the last word finishes a words test', () => {
  const s = new TypingSession({ text: 'ab cd', mode: 'words' });
  typeAll(s, 'ab c');
  s.type(' ', 2000);
  assert.equal(s.finished, true);
  assert.equal(s.netCorrect, 4);
});

test('strict mode blocks progress on errors', () => {
  const s = new TypingSession({ text: 'ab cd', mode: 'words', failMode: 'strict' });
  assert.equal(s.type('x', 0).kind, 'blocked');
  assert.equal(s.pos, 0);
  s.type('a', 10);
  assert.equal(s.type(' ', 20).kind, 'blocked');
  assert.equal(s.pos, 1);
  assert.equal(s.wrongKeys, 2);
});

test('sudden death ends on the first error', () => {
  const s = new TypingSession({ text: 'abc', mode: 'words', failMode: 'death' });
  s.type('a', 0);
  assert.equal(s.type('z', 10).kind, 'died');
  assert.equal(s.finished, true);
  assert.equal(s.failed, true);
});

test('time mode caps elapsed time at the duration', () => {
  const s = new TypingSession({ text: 'aaaa', mode: 'time', duration: 15 });
  s.type('a', 1000);
  assert.equal(s.elapsed(99999), 15000);
  assert.equal(s.remaining(6000), 10000);
});

test('summary: 50 correct chars in 60s is 10 WPM with 100% accuracy', () => {
  const text = 'a'.repeat(50);
  const s = new TypingSession({ text, mode: 'words' });
  typeAll(s, text, 60000 / 49, 0);
  const r = summarize(s, s.endedAt);
  assert.ok(Math.abs(r.wpm - 10) < 0.01);
  assert.equal(r.acc, 100);
  assert.equal(r.series.length, 60);
  assert.ok(r.series.at(-1).wpm > 0);
});

test('finishing early measures the real elapsed time, unlike the C version', () => {
  const s = new TypingSession({ text: 'abcde', mode: 'words' });
  typeAll(s, 'abcde', 250, 0);
  assert.equal(summarize(s, s.endedAt).ms, 1000);
});

test('stat helpers', () => {
  assert.equal(wpm(100, 60000), 20);
  assert.equal(wpm(10, 0), 0);
  assert.equal(accuracy(0, 0), 100);
  assert.equal(consistency([5, 5, 5]), 100);
  assert.ok(consistency([0, 10, 0, 10]) < 50);
  assert.equal(rankFor(0).level, 1);
  assert.equal(rankFor(70).name, 'นักพิมพ์สัมผัส');
  assert.equal(rankFor(500).next, null);
  assert.equal(ghostPosition([10, 20], 500), 5);
  assert.equal(ghostPosition([10, 20], 1500), 15);
  assert.equal(ghostPosition([10, 20], 9000), 20);
});

test('every language pack has words at each level and usable quotes', () => {
  for (const [code, pack] of Object.entries(LANGUAGES)) {
    for (const level of ['easy', 'medium', 'hard']) {
      assert.ok(pack.words[level].length >= 15, `${code}/${level}`);
      assert.ok(pack.words[level].every((w) => w.length > 0));
    }
    assert.ok(pack.quotes.length >= 10, code);
    for (const q of pack.quotes) assert.ok(!/ {2}|\n/.test(q), q);
  }
});

test('every character in the language packs exists on its keyboard layout', async () => {
  // keyboard.js ไม่แตะ DOM ตอน import จึงทดสอบบน Node ได้
  const { locate } = await import('../docs/app/js/keyboard.js');
  for (const [code, pack] of Object.entries(LANGUAGES)) {
    const generated = generateWords({ lang: code, difficulty: 'hard', count: 3000, rng: seededRandom(11) });
    const all = [...Object.values(pack.words).flat(), ...pack.quotes, generated].join(' ');
    for (const ch of new Set(all)) assert.ok(locate(ch, code), `${code}: ${ch} U+${ch.codePointAt(0).toString(16)}`);
  }
});

test('generated text has the requested word count and no double spaces', () => {
  for (const lang of Object.keys(LANGUAGES)) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const text = generateWords({ lang, difficulty, count: 80, rng: seededRandom(7) });
      assert.equal(text.split(' ').length, 80);
    }
  }
});

test('seeded text is stable; daily differs by date and language', () => {
  assert.equal(dailyText('en', '2026-11-01'), dailyText('en', '2026-11-01'));
  assert.notEqual(dailyText('en', '2026-11-01'), dailyText('en', '2026-11-02'));
  assert.notEqual(dailyText('en', '2026-11-01'), dailyText('th', '2026-11-01'));
  assert.equal(hashString('a'), hashString('a'));
});

test('weak keys rank by miss rate and drill targets them', () => {
  const stats = { q: { hit: 2, miss: 8 }, a: { hit: 90, miss: 10 }, z: { hit: 9, miss: 1 }, ' ': { hit: 0, miss: 9 } };
  assert.deepEqual(weakKeys(stats).map((k) => k.ch), ['q', 'a']);
  const { text, keys } = generateDrill({ lang: 'en', keyStats: stats, count: 40, rng: seededRandom(3) });
  assert.deepEqual(keys, ['q', 'a']);
  assert.ok(text.split(' ').every((w) => /[qa]/.test(w)));
  assert.equal(generateDrill({ lang: 'en', keyStats: {}, count: 10 }).text, null);
});

test('store survives corrupt data and blocked storage', () => {
  const broken = { getItem: () => '{not json', setItem: () => { throw new Error('quota'); } };
  const store = createStore(broken);
  assert.equal(store.state.settings.mode, 'time');
  store.save();
  assert.equal(createStore(null).state.history.length, 0);
});

test('store saves and restores merged settings', () => {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const store = createStore(storage);
  store.state.settings.lang = 'en';
  store.save();
  assert.equal(createStore(storage).state.settings.lang, 'en');
  assert.equal(createStore(storage).state.settings.keyboard, true);
});

test('recordResult tracks personal bests and key stats', () => {
  const state = emptyState();
  const config = { mode: 'time', param: 30, lang: 'en', difficulty: 'easy' };
  const result = (value) => ({ wpm: value, raw: value, acc: 99, consistency: 80, ms: 30000, progress: [1], keyHits: { a: 3 }, keyMisses: { a: 1 } });
  assert.equal(recordResult(state, config, result(50)).isBest, true);
  assert.equal(recordResult(state, config, result(40)).isBest, false);
  const third = recordResult(state, config, result(60));
  assert.equal(third.isBest, true);
  assert.equal(third.previous.wpm, 50);
  assert.equal(state.bests[configKey(config)].wpm, 60);
  assert.deepEqual(state.keyStats.en.a, { hit: 9, miss: 3 });
  assert.equal(state.history.length, 3);
});

test('streak counts back from today or yesterday', () => {
  const day = (n) => ({ at: new Date(2026, 10, n, 12).getTime() });
  const today = new Date(2026, 10, 10, 20);
  assert.equal(streak([day(10), day(9), day(8), day(6)], today), 3);
  assert.equal(streak([day(9), day(8)], today), 2);
  assert.equal(streak([day(7)], today), 0);
});

test('achievements unlock once with unique ids', () => {
  const state = emptyState();
  state.history.push({ lang: 'c', mode: 'daily', at: Date.now() });
  const ids = checkAchievements(state, { wpm: 65, acc: 90, ms: 30000, consistency: 50 }).map((a) => a.id);
  for (const id of ['first', 'wpm40', 'wpm60', 'coder', 'daily']) assert.ok(ids.includes(id), id);
  assert.deepEqual(checkAchievements(state, { wpm: 65 }), []);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
});

test('rain: typing a word clears it and scores', () => {
  const game = new RainGame({ words: ['cat'], rng: () => 0.5 });
  game.step(0.3);
  assert.equal(game.items.length, 1);
  game.input('c');
  game.input('a');
  assert.equal(game.input('t').kind, 'cleared');
  assert.equal(game.items.length, 0);
  assert.equal(game.score, 30);
  assert.equal(game.target, null);
});

test('rain: a missed word costs a life and three end the game', () => {
  const game = new RainGame({ words: ['aa', 'bb', 'cc', 'dd'], rng: () => 0.5 });
  let events = [];
  for (let i = 0; i < 2000 && !game.over; i++) events = events.concat(game.step(0.05));
  assert.equal(game.over, true);
  assert.equal(events.filter((e) => e.kind === 'lost').length, 3);
  assert.equal(game.input('a').kind, 'ignored');
});

test('rain: wrong key breaks the combo and keeps the lock', () => {
  const game = new RainGame({ words: ['cat'], rng: () => 0.5 });
  game.step(0.3);
  game.combo = 7;
  game.input('c');
  assert.equal(game.input('z').kind, 'miss');
  assert.equal(game.combo, 0);
  assert.notEqual(game.target, null);
  game.release();
  assert.equal(game.target, null);
  assert.equal(game.items[0].typed, 0);
});

test('rain: gold heals up to the cap and ice slows the fall', () => {
  const game = new RainGame({ words: ['a'], rng: () => 0.5 });
  game.step(0.3);
  game.items[0].kind = 'gold';
  game.input('a');
  assert.equal(game.lives, 4);
  game.step(3);
  game.items[0].kind = 'ice';
  game.input('a');
  assert.equal(game.slowFor, 6);
});
