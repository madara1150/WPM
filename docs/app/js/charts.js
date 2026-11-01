// กราฟเส้น SVG แบบแกนเดียว พร้อมเส้นชี้และ tooltip
const NS = 'http://www.w3.org/2000/svg';

function niceMax(value) {
  const safe = Math.max(10, value);
  const step = 10 ** Math.floor(Math.log10(safe));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= safe) return m * step;
  return 10 * step;
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// points: [{label, ...ค่า}], series: [{key, label, className}], marks: ฟิลด์จำนวนครั้งที่แสดงเป็นจุดบนแกนล่าง
export function lineChart(el, { points, series, marks, marksLabel, unit = 'WPM', xTitle = '' }) {
  el.innerHTML = '';
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  legend.innerHTML = series.map((s) => `<span><i class="swatch ${s.className}"></i>${s.label}</span>`).join('')
    + (marks ? `<span><i class="swatch dot"></i>${marksLabel}</span>` : '');
  if (series.length > 1 || marks) el.append(legend);

  const width = Math.max(280, el.clientWidth || 640);
  const height = 200;
  const pad = { top: 10, right: 12, bottom: 26, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...points.flatMap((p) => series.map((s) => p[s.key] ?? 0))));
  const x = (i) => pad.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-label': `กราฟ ${series.map((s) => s.label).join(' และ ')}` });

  for (let i = 0; i <= 4; i++) {
    const value = (max / 4) * i;
    svg.append(svgEl('line', { x1: pad.left, x2: width - pad.right, y1: y(value), y2: y(value), class: 'grid' }));
    const label = svgEl('text', { x: pad.left - 8, y: y(value) + 4, 'text-anchor': 'end', class: 'tick' });
    label.textContent = Math.round(value);
    svg.append(label);
  }

  const every = Math.max(1, Math.ceil(points.length / 8));
  points.forEach((p, i) => {
    if (i % every !== 0 && i !== points.length - 1) return;
    const label = svgEl('text', { x: x(i), y: height - 7, 'text-anchor': 'middle', class: 'tick' });
    label.textContent = p.label;
    svg.append(label);
  });

  [...series].reverse().forEach((s) => {
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[s.key] ?? 0).toFixed(1)}`).join('');
    svg.append(svgEl('path', { d, class: `line ${s.className}` }));
    if (points.length === 1) svg.append(svgEl('circle', { cx: x(0), cy: y(points[0][s.key]), r: 4, class: `end ${s.className}` }));
  });

  if (marks) {
    points.forEach((p, i) => {
      if (p[marks]) svg.append(svgEl('circle', { cx: x(i), cy: y(0) - 5, r: Math.min(6, 3 + p[marks]), class: 'err-dot' }));
    });
  }

  const cross = svgEl('line', { y1: pad.top, y2: pad.top + innerH, class: 'cross', visibility: 'hidden' });
  svg.append(cross);
  const dots = series.map((s) => {
    const dot = svgEl('circle', { r: 4, class: `end ${s.className}`, visibility: 'hidden' });
    svg.append(dot);
    return dot;
  });

  const wrap = document.createElement('div');
  wrap.className = 'chart-plot';
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  wrap.append(svg, tip);
  el.append(wrap);

  const move = (event) => {
    const box = svg.getBoundingClientRect();
    const px = (event.clientX - box.left) * (width / box.width);
    const i = Math.max(0, Math.min(points.length - 1, Math.round(((px - pad.left) / innerW) * (points.length - 1))));
    const p = points[i];
    cross.setAttribute('x1', x(i));
    cross.setAttribute('x2', x(i));
    cross.setAttribute('visibility', 'visible');
    dots.forEach((dot, n) => {
      dot.setAttribute('cx', x(i));
      dot.setAttribute('cy', y(p[series[n].key] ?? 0));
      dot.setAttribute('visibility', 'visible');
    });
    tip.innerHTML = `<b>${xTitle}${p.label}</b>`
      + series.map((s) => `<span>${s.label} <em>${Math.round(p[s.key] ?? 0)} ${unit}</em></span>`).join('')
      + (marks && p[marks] ? `<span>${marksLabel} <em>${p[marks]}</em></span>` : '');
    tip.hidden = false;
    const left = (x(i) / width) * box.width;
    tip.style.left = `${Math.min(box.width - tip.offsetWidth - 4, Math.max(4, left + 12))}px`;
  };
  const leave = () => {
    tip.hidden = true;
    cross.setAttribute('visibility', 'hidden');
    dots.forEach((dot) => dot.setAttribute('visibility', 'hidden'));
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerleave', leave);
}
