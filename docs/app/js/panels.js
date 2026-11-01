import { LANGUAGES } from './words.js';
import { ACHIEVEMENTS, practiceDays, streak } from './store.js';
import { weakKeys } from './textgen.js';
import { escapeHtml, glyph, heatKeyboard, renderKeyboard } from './keyboard.js';
import { lineChart } from './charts.js';
import { toast } from './fx.js';

const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
const MODE_NAMES = { time: 'เวลา', words: 'คำ', quote: 'ข้อความ', daily: 'วันนี้', drill: 'จุดอ่อน' };

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} ชม. ${minutes} น.` : `${minutes} นาที`;
}

function formatDate(at) {
  return new Date(at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function heatSection(host, state, lang) {
  const stats = state.keyStats[lang] ?? {};
  const weak = weakKeys(stats, 8);
  host.querySelector('#heat-weak').innerHTML = weak.length
    ? weak.map((k) => `<li><kbd>${escapeHtml(glyph(k.ch))}</kbd> ${Math.round(k.rate * 100)}%</li>`).join('')
    : '<li class="sub">ยังไม่มีปุ่มที่พลาดซ้ำในภาษานี้</li>';
  const board = host.querySelector('#heat-board');
  renderKeyboard(board, lang);
  heatKeyboard(board, lang, stats);
}

export function renderStats(host, store) {
  const { state } = store;
  const { history } = state;
  if (!history.length && !state.rainGames) {
    host.innerHTML = `<div class="empty"><h2>ยังไม่มีสถิติ</h2><p>พิมพ์จบหนึ่งรอบแล้วกลับมาดูความก้าวหน้าที่หน้านี้ได้เลย</p><a class="btn" href="#type">เริ่มพิมพ์</a></div>
      ${achievementGrid(state)}`;
    return;
  }

  const recent = history.slice(-10);
  const best = Math.max(0, ...history.map((h) => h.wpm));
  const totalSeconds = history.reduce((sum, h) => sum + h.secs, 0);
  const lang = state.settings.lang;

  host.innerHTML = `
    <dl class="tiles">
      <div><dt>เร็วที่สุด</dt><dd>${Math.round(best)}<small>WPM</small></dd></div>
      <div><dt>เฉลี่ย 10 รอบล่าสุด</dt><dd>${Math.round(average(recent.map((h) => h.wpm)))}<small>WPM</small></dd></div>
      <div><dt>แม่นยำเฉลี่ย</dt><dd>${Math.round(average(recent.map((h) => h.acc)))}<small>%</small></dd></div>
      <div><dt>จำนวนรอบ</dt><dd>${history.length.toLocaleString('en-US')}</dd></div>
      <div><dt>เวลาฝึกรวม</dt><dd class="small">${formatDuration(totalSeconds)}</dd></div>
      <div><dt>ฝึกติดกัน</dt><dd>${streak(history)}<small>วัน</small></dd></div>
      <div><dt>วันที่ฝึกทั้งหมด</dt><dd>${practiceDays(history).size}<small>วัน</small></dd></div>
      <div><dt>ฝนคำสูงสุด</dt><dd>${state.rainBest.toLocaleString('en-US')}</dd></div>
    </dl>
    ${history.length ? `
    <div class="panel"><h3>แนวโน้มความเร็ว</h3><div id="trend" class="chart"></div></div>
    <div class="panel">
      <div class="panel-head"><h3>ปุ่มที่พลาดบ่อย</h3><div id="heat-lang"></div></div>
      <div id="heat-board" class="keyboard heat"></div>
      <div class="heat-legend"><span>พลาดน้อย</span><i></i><span>พลาดบ่อย</span></div>
      <ul id="heat-weak" class="worst"></ul>
    </div>` : ''}
    ${achievementGrid(state)}
    ${history.length ? `
    <div class="panel">
      <h3>ประวัติล่าสุด</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>เมื่อ</th><th>โหมด</th><th>ภาษา</th><th>WPM</th><th>แม่นยำ</th></tr></thead>
        <tbody>${history.slice(-12).reverse().map((h) => `<tr>
          <td>${formatDate(h.at)}</td>
          <td>${MODE_NAMES[h.mode] ?? h.mode}</td>
          <td>${LANGUAGES[h.lang]?.label ?? h.lang}</td>
          <td class="num">${Math.round(h.wpm)}</td>
          <td class="num">${h.acc.toFixed(1)}%</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>` : ''}`;

  if (!history.length) return;

  const slice = history.slice(-60);
  lineChart(host.querySelector('#trend'), {
    points: slice.map((h, i) => {
      const window = slice.slice(Math.max(0, i - 4), i + 1);
      return { label: i + 1, wpm: h.wpm, avg: average(window.map((w) => w.wpm)) };
    }),
    series: [
      { key: 'avg', label: 'เฉลี่ย 5 รอบ', className: 's-main' },
      { key: 'wpm', label: 'แต่ละรอบ', className: 's-sub' },
    ],
    xTitle: 'รอบที่ ',
  });

  const picker = host.querySelector('#heat-lang');
  const paintPicker = (active) => {
    picker.innerHTML = '';
    picker.className = 'seg';
    for (const [code, pack] of Object.entries(LANGUAGES)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = pack.label;
      button.setAttribute('aria-pressed', String(code === active));
      button.addEventListener('click', () => paintPicker(code));
      picker.append(button);
    }
    heatSection(host, state, active);
  };
  paintPicker(lang);
}

function achievementGrid(state) {
  const earned = ACHIEVEMENTS.filter((a) => state.earned[a.id]).length;
  return `
    <div class="panel">
      <h3>เหรียญรางวัล <span class="sub">${earned}/${ACHIEVEMENTS.length}</span></h3>
      <ul class="badges">${ACHIEVEMENTS.map((a) => `
        <li class="${state.earned[a.id] ? 'on' : ''}"><b>${a.name}</b><span>${a.note}</span></li>`).join('')}
      </ul>
    </div>`;
}

const BANNER = String.raw`      ## ##     ##  ######  ######## ######## ##    ## ########  ########
      ## ##     ## ##    ##    ##       ##     ##  ##  ##     ## ##
      ## ##     ## ##          ##       ##      ####   ##     ## ##
      ## ##     ##  ######     ##       ##       ##    ########  ######
##    ## ##     ##       ##    ##       ##       ##    ##        ##
##    ## ##     ## ##    ##    ##       ##       ##    ##        ##
 ######   #######   ######     ##       ##       ##    ##        ########`;

export function renderSettings(host, store, { segmented, onChange }) {
  const s = store.state.settings;
  const rows = [
    ['ธีม', 'theme', [['ember', 'ส้มลาดกระบัง'], ['cmd', 'Command Prompt'], ['midnight', 'เที่ยงคืน'], ['paper', 'กระดาษ']], 'ค่าเริ่มต้นตามระบบของคุณ'],
    ['โหมดความผิดพลาด', 'failMode', [['off', 'ปกติ'], ['strict', 'ห้ามผ่าน'], ['death', 'Sudden Death']], 'ห้ามผ่าน: ต้องกดถูกจึงไปต่อ · Sudden Death: ผิดครั้งเดียวจบ'],
    ['แป้นพิมพ์บนจอ', 'keyboard', [[true, 'แสดง'], [false, 'ซ่อน']], 'บอกปุ่มและนิ้วที่ต้องใช้ รองรับเกษมณีและ QWERTY'],
    ['เงาสถิติ', 'ghost', [[true, 'แข่งกับเงา'], [false, 'ปิด']], 'เคอร์เซอร์จางๆ คือจังหวะของสถิติดีที่สุดในโหมดนั้น'],
    ['เสียงปุ่ม', 'sound', [['off', 'ปิด'], ['click', 'คลิก'], ['type', 'พิมพ์ดีด']], ''],
    ['เคอร์เซอร์', 'caret', [['bar', 'เส้น'], ['block', 'บล็อก'], ['under', 'ขีดล่าง']], ''],
    ['ขนาดตัวอักษร', 'size', [['s', 'เล็ก'], ['m', 'กลาง'], ['l', 'ใหญ่']], ''],
  ];

  host.innerHTML = '<div class="settings"></div>';
  const list = host.querySelector('.settings');
  const paint = () => {
    list.replaceChildren();
    for (const [label, field, options, note] of rows) {
      const row = document.createElement('div');
      row.className = 'setting';
      const text = document.createElement('div');
      text.innerHTML = `<b>${label}</b>${note ? `<span>${note}</span>` : ''}`;
      const current = field === 'theme' ? document.documentElement.dataset.theme : s[field];
      row.append(text, segmented(label, options, current, (value) => {
        s[field] = value;
        onChange();
        paint();
      }));
      list.append(row);
    }

    const data = document.createElement('div');
    data.className = 'setting';
    data.innerHTML = `<div><b>ข้อมูลของคุณ</b><span>เก็บในเบราว์เซอร์นี้เท่านั้น ส่งออกไว้เพื่อย้ายเครื่องได้</span></div>
      <div class="data-actions">
        <button class="ghost-btn" id="export" type="button">ส่งออก</button>
        <label class="ghost-btn">นำเข้า<input id="import" type="file" accept="application/json" hidden></label>
        <button class="ghost-btn danger" id="wipe" type="button">ล้างสถิติ</button>
      </div>`;
    list.append(data);

    const about = document.createElement('div');
    about.className = 'origin';
    about.innerHTML = `<pre aria-hidden="true">${BANNER}</pre>
      <p>JUST TYPE เริ่มจากโปรแกรม command prompt ภาษา C ในวิชา Computer Programming ของ KMITL ปี 2564 ต้นฉบับยังอยู่ใน <code>zaza.c</code> <a href="about.html">อ่านที่มาของโปรเจกต์</a></p>`;
    list.append(about);

    list.querySelector('#export').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'just-type-data.json';
      link.click();
      URL.revokeObjectURL(link.href);
    });
    list.querySelector('#import').addEventListener('change', async (event) => {
      try {
        const next = JSON.parse(await event.target.files[0].text());
        if (!Array.isArray(next.history)) throw new Error('bad file');
        store.replace(next);
        onChange();
        toast('นำเข้าข้อมูลแล้ว');
        renderSettings(host, store, { segmented, onChange });
      } catch {
        toast('นำเข้าไม่สำเร็จ', 'ไฟล์นี้ไม่ใช่ข้อมูลของ JUST TYPE');
      }
    });
    list.querySelector('#wipe').addEventListener('click', () => {
      if (confirm('ล้างประวัติ สถิติ และเหรียญทั้งหมด? ย้อนกลับไม่ได้')) {
        store.reset();
        toast('ล้างสถิติแล้ว');
        renderSettings(host, store, { segmented, onChange });
      }
    });
  };
  paint();
}
