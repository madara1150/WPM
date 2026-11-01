// เกมฝนคำ: ตรรกะล้วน ตำแหน่งเป็นสัดส่วน 0..1 ของพื้นที่เล่น
const MAX_LIVES = 5;

export class RainGame {
  constructor({ words, rng = Math.random }) {
    this.words = words;
    this.rng = rng;
    this.items = [];
    this.lives = 3;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.cleared = 0;
    this.misses = 0;
    this.chars = 0;
    this.time = 0;
    this.slowFor = 0;
    this.target = null;
    this.over = false;
    this.spawnIn = 0.2;
    this.nextId = 1;
  }

  get level() { return 1 + Math.floor(this.cleared / 8); }
  get multiplier() { return 1 + Math.floor(this.combo / 5); }
  get spawnGap() { return Math.max(0.75, 2.5 - this.level * 0.17); }
  get fallSpeed() { return Math.min(0.26, 0.075 + this.level * 0.012); }

  #pickWord() {
    const taken = new Set(this.items.map((i) => i.chars[0]));
    for (let tries = 0; tries < 12; tries++) {
      const word = this.words[Math.floor(this.rng() * this.words.length)];
      if (!taken.has(Array.from(word)[0])) return word;
    }
    return null;
  }

  #spawn() {
    const word = this.#pickWord();
    if (!word) return;
    const chars = Array.from(word);
    const roll = this.rng();
    const kind = roll < 0.05 ? 'gold' : roll < 0.11 ? 'ice' : 'normal';
    const width = Math.min(0.5, chars.length * 0.022);
    this.items.push({
      id: this.nextId++,
      word,
      chars,
      typed: 0,
      kind,
      y: 0,
      x: 0.03 + this.rng() * (0.94 - width),
      drift: 0.82 + this.rng() * 0.36,
    });
  }

  step(dt) {
    if (this.over) return [];
    const events = [];
    this.time += dt;
    this.slowFor = Math.max(0, this.slowFor - dt);

    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.#spawn();
      this.spawnIn = this.spawnGap;
    }

    const speed = this.fallSpeed * (this.slowFor > 0 ? 0.45 : 1);
    for (const item of [...this.items]) {
      item.y += speed * item.drift * dt;
      if (item.y >= 1) {
        this.items.splice(this.items.indexOf(item), 1);
        if (this.target === item.id) this.target = null;
        this.combo = 0;
        this.lives--;
        events.push({ kind: 'lost', item });
        if (this.lives <= 0) {
          this.over = true;
          events.push({ kind: 'over' });
          break;
        }
      }
    }
    return events;
  }

  input(ch) {
    if (this.over) return { kind: 'ignored' };
    let item = this.items.find((i) => i.id === this.target);
    if (!item) {
      item = this.items
        .filter((i) => i.chars[0] === ch)
        .sort((a, b) => b.y - a.y)[0];
      if (!item) return this.#miss();
      this.target = item.id;
    }
    if (item.chars[item.typed] !== ch) return this.#miss();

    item.typed++;
    this.chars++;
    if (item.typed < item.chars.length) return { kind: 'hit', item };

    this.items.splice(this.items.indexOf(item), 1);
    this.target = null;
    this.cleared++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += item.chars.length * 10 * this.multiplier;
    if (item.kind === 'gold') this.lives = Math.min(MAX_LIVES, this.lives + 1);
    if (item.kind === 'ice') this.slowFor = 6;
    return { kind: 'cleared', item };
  }

  #miss() {
    this.combo = 0;
    this.misses++;
    return { kind: 'miss' };
  }

  // ปล่อยคำที่ล็อกไว้ เผื่อเลือกผิดคำ
  release() {
    const item = this.items.find((i) => i.id === this.target);
    if (item) item.typed = 0;
    this.target = null;
  }
}
