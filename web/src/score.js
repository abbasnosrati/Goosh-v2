const ns = 'http://www.w3.org/2000/svg',
  steps = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]
const step = m => Math.floor(m / 12) * 7 + steps[m % 12] - 37
export function score(host, e, {
  zoom = 1,
  wrap = true,
  selected = new Set(),
  pick,
  insert
} = {}) {
  host.replaceChildren();
  const onsets = [...new Set(e.notes.map(n=>n.at))].sort((a,b)=>a-b);
  const slots = new Map(onsets.map((at,i)=>[at,i]));
  const unit = 36 * zoom,
    end = Math.max(1,onsets.length + (insert ? 1 : 0)),
    width = Math.max(240, host.clientWidth || 700),
    margin = 64 + Object.keys(e.key).length * 17,
    per = Math.max(1, Math.floor((width - margin - 22) / unit)),
    rows = wrap ? Math.ceil(end / per) : 1
  for (let row = 0; row < rows; row++) {
    const svg = document.createElementNS(ns, 'svg'),
      w = wrap ? width : Math.max(width, margin + end * unit + 20);
    const draw = (tag, attrs, txt) => {
      const el = document.createElementNS(ns, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      if (txt !== undefined) el.textContent = txt;
      svg.append(el);
      return el
    };
    svg.setAttribute('width', w);
    svg.setAttribute('height', 165);
    host.append(svg);
    const line = (x, y, x2, y2) => draw('line', {
      x1: x,
      y1: y,
      x2,
      y2,
      stroke: 'currentColor'
    });
    for (let j = 0; j < 5; j++) line(4, 104 - j * 9, w - 4, 104 - j * 9);
    draw('text', {
      x: 7,
      y: 103,
      'font-size': 46,
      fill: 'currentColor'
    }, '𝄞');
    Object.entries(e.key).forEach(([pc, mark], i) => draw('text', {
      x: 40 + 17 * i,
      y: 106 - step(60 + Number(pc)) * 4.5,
      'font-size': 13,
      fill: 'currentColor'
    }, mark));
    e.notes.forEach((n, i) => {
      const at = slots.get(n.at);
      if (wrap && Math.floor(at / per) !== row) return;
      const visualMidi = Number.isInteger(n.staffM) ? n.staffM : n.m;
      const x = margin + (at - row * per) * unit,
        y = 104 - step(visualMidi) * 4.5;
      for (let l = 113; l <= y; l += 9) line(x - 9, l, x + 9, l);
      for (let l = 59; l >= y; l -= 9) line(x - 9, l, x + 9, l);
      const el = draw('ellipse', {
        cx: x,
        cy: y,
        rx: 5.8,
        ry: 3.9,
        transform: `rotate(-20 ${x} ${y})`,
        fill: 'currentColor',
        stroke: 'currentColor'
      });
      // A variable E-koron has an explicit Persian Koron accidental even
      // though E-flat stays in the key signature. Draw the musical glyph,
      // not the Persian word 'کرن', immediately before this note.
      const explicitKoron = n.staffAccidental === 'کرن';
      const noteAccidental = explicitKoron ? '𝇪' : (n.staffAccidental ||
        ([1, 3, 6, 8, 10].includes(n.m % 12) ? '♯' : ''));
      if (noteAccidental) draw('text', {
        x: x - 17,
        y: y + 4,
        'font-size': explicitKoron ? 19 : 16,
        'font-family': explicitKoron ? '"Noto Music", "Bravura", "Segoe UI Symbol", serif' : 'inherit',
        fill: 'currentColor'
      }, noteAccidental);
      if (selected.has(i)) el.setAttribute('stroke-width', 3);
      draw('circle', {
        cx: x,
        cy: y,
        r: 10,
        fill: 'transparent'
      }).onclick = ev => {
        ev.stopPropagation();
        pick?.(i,ev.shiftKey || ev.ctrlKey || ev.metaKey)
      }
    });
    svg.onclick = ev => {
      const rect = svg.getBoundingClientRect(),
        s = Math.round((104 - (ev.clientY - rect.top)) / 4.5);
      let m = 60;
      while (m < 108 && step(m) < s) m++;
      while (m > 24 && step(m) > s) m--;
      const slot = Math.max(0,row * per + Math.round((ev.clientX - rect.left - margin) / unit));
      const endTime = e.notes.reduce((end,n)=>Math.max(end,n.at+n.d),0);
      insert?.(m,onsets[slot] ?? endTime)
    }
  }
}
