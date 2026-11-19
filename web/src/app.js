import {
  fresh,
  names,
  label,
  freq,
  valid
} from './model.js'
import {
  unlock,
  voice,
  liveVoice,
  microphone
} from './audio.js?v=7237d72'
import {
  score
} from './score.js'
import { renderHome } from './home.js?v=hub-iranian-features-2';
const $ = s => document.querySelector(s),
  app = $('#app');
let fa = localStorage.lang !== 'en',
  dark = localStorage.theme === 'dark',
  page = routeFromHash(),
  e = fresh(),
  rec = null,
  pen = false,
  zoom = 1,
  wrap = true,
  oct = 4,
  sel = new Set(),
  held = new Map(),
  session = null
const collection = new Map();
const prefix = 'goosh.etude.';
for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(!key.startsWith(prefix))continue;
  try{
    const entry=JSON.parse(localStorage.getItem(key));
    if(valid(entry.data))collection.set(key.slice(prefix.length),entry);
  }catch{}
}
function addEtude(data,origin,id=globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)){
  const entry={data,origin};
  localStorage.setItem(prefix+id,JSON.stringify(entry));
  collection.set(id,entry);
  return id;
}
if(!collection.size && localStorage.etude){
  try{
    const previous=JSON.parse(localStorage.etude);
    if(valid(previous))addEtude(previous,'own','previous');
  }catch{}
}
let activeId=null;
function loadRoute(){
  const id=location.hash.slice(1).split('/')[1];
  activeId=page!=='home' && collection.has(id)?id:null;
  e=activeId?collection.get(activeId).data:fresh();
  sel.clear();
  pen=false;
}
loadRoute();
const t = (en, ir) => fa ? ir : en,
  save = () => {
    if(activeId)localStorage.setItem(prefix+activeId,JSON.stringify(collection.get(activeId)));
  },
  el = (tag, parent, txt, cls) => {
    const x = document.createElement(tag);
    if (txt !== undefined) x.textContent = txt;
    if (cls) x.className = cls;
    parent.append(x);
    return x
  },
  row = p => el('div', p, undefined, 'row controls')

function btn(p, s, fn, tip = s) {
  const b = el('button', p, s);
  b.title = tip;
  b.onclick = fn;
  return b
}

function field(p, s, val, fn, options, limits) {
  const l = el('label', p, s),
    x = el(options ? 'select' : 'input', l);
  if (options)
    for (const [v, n] of options) {
      const o = el('option', x, n);
      o.value = v
    } else if (typeof val === 'number') {
      x.type = 'number';
      [x.min, x.max, x.step] = limits || [0, 120, .1]
    } x.value = val;
  x.onchange = () => {
    if (!x.reportValidity()) return;
    fn(typeof val === 'number' ? Number(x.value) : x.value);
    save()
  };
  return x
}

function stopKeys() {
  for (const f of [...held.values()]) f()
}

function piano(parent, onStart) {
  const p = el('div', parent, undefined, 'instrument');
  const tools = row(p);
  el('strong',tools,t('Piano','پیانو'));
  const viewport = el('div',p,undefined,'keys');
  const box = el('div',viewport,undefined,'board');
  const first = page === 'practice' ? Math.min(48,...e.notes.map(n=>n.m)) : 48;
  const last = page === 'practice' ? Math.max(95,...e.notes.map(n=>n.m)) : 95;
  const low = Math.floor(first/12)*12, high=Math.floor(last/12)*12+11;
  oct=Math.max(low/12-1,Math.min(high/12-1,oct));
  const whiteCount=(high-low+1)*7/12;
  box.style.setProperty('--whites',whiteCount);
  let white = 0;
  const shortcuts=['A','W','S','E','D','F','T','G','Y','H','U','J','K','O','L','P'];
  viewport.tabIndex=0;
  viewport.setAttribute('aria-label',t('Piano keyboard','کلاویه‌های پیانو'));
  viewport.onwheel=ev=>{
    if(ev.deltaX || ev.ctrlKey || !ev.deltaY)return;
    const before=viewport.scrollLeft;
    viewport.scrollLeft+=ev.deltaY*(ev.deltaMode===1?16:1);
    if(before!==viewport.scrollLeft)ev.preventDefault();
  };
  function jump(value){
    oct=value;
    for(const key of box.children){
      const shortcut=shortcuts[Number(key.dataset.midi)-(oct+1)*12];
      delete key.dataset.shortcut;
      key.title=key.ariaLabel+' · '+freq(e,Number(key.dataset.midi)).toFixed(1)+' Hz';
      if(shortcut){key.dataset.shortcut='Key'+shortcut;key.title+=' ('+shortcut+')'}
    }
    viewport.scrollLeft=(12*(oct+1)-low)/12*7*box.clientWidth/whiteCount;

  }
  field(tools,t('Octave','اکتاو'),oct,jump,Array.from({length:whiteCount/7},(_,i)=>{const v=low/12-1+i;return [v,v.toLocaleString(fa?'fa':'en')]}));
  for(let m=low;m<=high;m++){
    const black=names[m%12].includes('♯'), b=el('button',box,label(m));
    b.dataset.midi=m;
    const syllables=fa?['دو','دو♯','ر','ر♯','می','فا','فا♯','سل','سل♯','لا','لا♯','سی']:['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
    el('small',b,syllables[m%12]);

    const shortcut=shortcuts[m-(oct+1)*12];
    b.title = label(m) + (shortcut ? ' (' + shortcut + ')' : '');
    if (shortcut) b.dataset.shortcut = 'Key' + shortcut;
    b.ariaLabel = label(m);
    if (black) {
      b.className = 'black';
      b.style.left = ((white - .31) / whiteCount * 100) + '%'
    } else white++;
    const pressed = new Set();
    b.begin = (id, at, audioTime = unlock().currentTime) => {
      pressed.add(id);
      const recordDuration = onStart(m, audioTime);
      const off = liveVoice(freq(e, m), recordDuration, audioTime);
      b.classList.add('down');
      held.set(id, () => {
        held.delete(id);
        pressed.delete(id);
        if (!pressed.size) b.classList.remove('down');
        const d = (performance.now() - at) / 1000;
        off(d < .18 ? 2 : Math.min(6, d));

      })
    };
  }

  const octaveRail=el('div',viewport,undefined,'octave-rail');
  octaveRail.style.setProperty('--whites',whiteCount);
  for(let midi=low;midi<=high;midi+=12)el('span',octaveRail,'C'+(midi/12-1));
  requestAnimationFrame(()=>jump(oct));
  const fingers = new Map();
  function moveTo(id, position, key, time, audioTime) {
    if (position.key === key) return;
    held.get(id)?.();
    position.key = key;
    key?.begin(id, time, audioTime);
  }
  box.onpointerdown = ev => {
    const key = ev.target.closest('button');
    if (!key || ev.button !== 0) return;
    ev.preventDefault();
    box.setPointerCapture(ev.pointerId);
    fingers.set(ev.pointerId, {key, x: ev.clientX, y: ev.clientY, time: ev.timeStamp});
    key.begin(ev.pointerId, ev.timeStamp);
  };
  box.onpointermove = ev => {
    const position = fingers.get(ev.pointerId);
    if (!position) return;
    // Preserve the order of crossings delivered together in a single input event.
    const batchStart = Math.max(position.time, ev.timeStamp - 24);
    const audioStart = Math.max(unlock().currentTime, position.audioEnd || 0);
    let lastCrossing;
    const samples = ev.getCoalescedEvents?.() || [];
    for (const point of [...samples, ev]) {
      const dx = point.clientX - position.x, dy = point.clientY - position.y;
      if (!dx && !dy) continue;
      // Hit-test between samples so a fast swipe still crosses narrow black keys.
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
      for (let step = 1; step <= steps; step++) {
        const fraction = step / steps;
        const hit = document.elementFromPoint(position.x + dx * fraction, position.y + dy * fraction);
        const key = hit?.closest('button');
        const next = key?.parentElement === box ? key : null;
        if (next === position.key) continue;
        const time = position.time + (point.timeStamp - position.time) * fraction;
        const audioTime = Math.max(audioStart + Math.max(0, time - batchStart) / 1000,
          lastCrossing === undefined ? audioStart : lastCrossing + .002);
        moveTo(ev.pointerId, position, next, time, audioTime);
        lastCrossing = audioTime;
        position.audioEnd = audioTime;
      }
      Object.assign(position, {x: point.clientX, y: point.clientY, time: point.timeStamp});
    }
  };
  box.onlostpointercapture = box.onpointerup = box.onpointercancel = ev => {
    if (fingers.delete(ev.pointerId)) held.get(ev.pointerId)?.();
  };
}

function refreshTake(take) {
  if (take.pending) return;
  take.pending = true;
  requestAnimationFrame(() => {
    take.pending = false;
    if (rec === take) {
      save();
      sheet();
    }
  });
}

function sheet() {
  const h = $('.score');
  if (h) score(h, e, {
    zoom,
    wrap,
    selected: sel,
    pick: (i, multi) => {
      if(rec)return;
      if(!multi){sel.clear();sel.add(i);sheet();noteSettings(e.notes[i]);return}
      if (sel.has(i)) sel.delete(i);
      else sel.add(i);
      sheet()
    },
    insert: (m, at) => {
      if (pen) {
        e.notes.push({
          m,
          at,
          d: 60 / e.bpm
        });
        save();
        sheet()
      }
    }
  })
}

function noteSettings(note) {
  const earlier = e.notes.filter(n => n.at < note.at);
  const precedingEnd = earlier.reduce((end,n) => Math.max(end,n.at+n.d),0);
  const rest = Math.max(0,note.at-precedingEnd);
  const dialog = el('dialog', document.body);
  const heading = el('h2',dialog,t('Note settings','تنظیمات نت')+' · '+label(note.m));
  dialog.setAttribute('aria-label',heading.textContent);
  const duration = field(dialog,t('Duration (s)','کشش (ثانیه)'),+note.d.toFixed(3),()=>{},null,[.001,100000,'any']);
  const silence = field(dialog,t('Rest before note (s)','سکوت پیش از نت (ثانیه)'),+rest.toFixed(3),()=>{},null,[0,100000,'any']);
  const initialDuration = duration.value, initialRest = silence.value;
  const actions = row(dialog);
  btn(actions,t('Save','ذخیره'),()=>{
    if(!duration.value || !silence.value || !duration.reportValidity() || !silence.reportValidity())return;
    if(silence.value!==initialRest){
      const onset=note.at, shift=precedingEnd+Number(silence.value)-onset;
      for(const n of e.notes)if(n.at>=onset)n.at+=shift;
    }
    if(duration.value!==initialDuration)note.d=Number(duration.value);
    save();sheet();dialog.close();
  });
  btn(actions,t('Cancel','انصراف'),()=>dialog.close());
  dialog.onclose=()=>dialog.remove();
  dialog.showModal();
}

function studio() {
  const heading = el('h2', app, e.title || t('Untitled etude', 'اتود بدون نام'), 'print-title');
  const top = row(app);top.classList.add('project-actions');
  const title = field(top, t('Etude', 'اتود'), e.title, v => {
    e.title = v;
    heading.textContent = v
  });
  title.placeholder = t('Untitled', 'بدون نام');
  btn(top, t('Share file', 'اشتراک فایل'), async () => {
    if (window.Capacitor?.getPlatform() === 'android') {
      try {
        await window.Capacitor.Plugins.EtudeFiles.share({
          name: e.title || 'Etude',
          content: JSON.stringify(e)
        })
      } catch {
        alert(t('Sharing failed', 'اشتراک فایل انجام نشد'))
      }
      return
    }
    const f = new File([JSON.stringify(e)], (e.title || 'Etude') + '.goosh', {
      type: 'application/json'
    });
    if (navigator.canShare?.({
        files: [f]
      })) {
      try {
        await navigator.share({
          files: [f]
        })
      } catch {}
      return
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500)
  });
  btn(top, 'PDF', async () => {
    const prev = wrap;
    wrap = true;
    sheet();
    if (window.Capacitor?.getPlatform() === 'android') {
      try {
        await window.Capacitor.Plugins.EtudeFiles.printScore({
          name: e.title || 'Etude'
        })
      } catch {
        alert(t('Printing failed', 'چاپ انجام نشد'))
      }
      return
    }
    print();
    wrap = prev;
    sheet()
  })
  const panel = el('section', app),
    r = row(panel);
  const record = btn(r, rec ? t('■ Stop', '■ توقف') : t('● Record', '● ضبط'), toggle, t('Record / Stop', 'ضبط / توقف') + ' (R)');
  record.dataset.record = '';record.className=rec?'recording':'primary';

  function toggle() {
    stopKeys();
    if (rec) { save(); rec = null; }
    else {
      unlock();
      rec = {
        start: unlock().currentTime,
        base: Math.max(0, ...e.notes.map(n => n.at + n.d))
      }
    }
    render()
  }
  btn(r, t('Pen', 'قلم'), () => {
    pen = !pen;
    render()
  }).classList.toggle('active', pen);
  btn(r, t('Play', 'پخش'), () => {
    unlock();
    for (const n of e.notes) voice(freq(e, n.m), n.at)(n.d)
  });
  btn(r, '−', () => {
    zoom = Math.max(.4, zoom - .2);
    sheet()
  }, t('Zoom out', 'کوچک‌نمایی'));
  btn(r, '+', () => {
    zoom = Math.min(3, zoom + .2);
    sheet()
  }, t('Zoom in', 'بزرگ‌نمایی'));
  btn(r, t('Wrap staff', 'چندخطی'), () => {
    wrap = !wrap;
    render()
  }).classList.toggle('active', wrap);
  piano(panel, (m, at) => {
    if (!rec) return;
    const n = {
      m,
      at: rec.base + Math.max(0, at - rec.start),
      d: .001
    };
    const take = rec;
    e.notes.push(n);
    refreshTake(take);
    return d => {
      if (rec !== take) return;
      n.d = d;
      refreshTake(take)
    }
  });
  el('h2',panel,t('Score','خط حامل'),'score-title');
  el('div', panel, undefined, 'score')
  const timing = el('details', panel, undefined, 'controls');
  el('summary', timing, t('Edit notes & timing', 'ویرایش نت و زمان'));
  const edit = row(timing);
  btn(edit, t('Select all', 'انتخاب همه'), () => {
    sel = new Set(e.notes.keys());
    sheet()
  });
  btn(edit, t('Delete', 'حذف'), () => {
    e.notes = e.notes.filter((_, i) => !sel.has(i));
    sel.clear();
    save();
    sheet()
  }, t('Delete selected notes', 'حذف نت‌های انتخاب‌شده') + ' (Delete)').dataset.del = '';
  field(edit, 'BPM', e.bpm, v => {
    const ratio = e.bpm / v;
    e.notes.forEach(n => {
      n.at *= ratio;
      n.d *= ratio
    });
    e.bpm = v;
    sheet()
  }, null, [20, 300, 1]);
  const d = field(edit, t('Duration (s)', 'کشش (ثانیه)'), 1, () => {}, null, [.01, 120, .01]),
    gap = field(edit, t('Rest (s)', 'سکوت (ثانیه)'), 0, () => {}, null, [0, 120, .01]);
  btn(edit, t('Apply timing', 'اعمال زمان'), () => {
    if (!d.reportValidity() || !gap.reportValidity()) return;
    const targets = [...sel].map(i => e.notes[i]).sort((a, b) => a.at - b.at);
    let last, at;
    for (const n of targets) {
      const old = n.at;
      if (old !== last) at = last === undefined ? old : at + Number(d.value) + Number(gap.value);
      last = old;
      n.at = at;
      n.d = Number(d.value)
    }
    save();
    sheet()
  })
  tuning();
  rules();
  sheet()
}

function detail(name) {
  const d = el('details', app);
  el('summary', d, name);
  return d
}

function tuning() {
  const p = detail(t('Tuning & key signature', 'کوک و سرکلید'));
  for (const k in e.marks) field(p, k + ' ¢', e.marks[k], v => e.marks[k] = v, null, [-1200, 1200, 1]);
  const r = row(p);
  let pc = 0;
  const sync = () => {
    mark.value = e.key[pc] || '';
    offset.value = e.offset[pc] || 0
  };
  field(r, t('Pitch', 'نت'), 0, v => {
    pc = v;
    sync()
  }, names.map((n, i) => [i, n]));
  const mark = field(r, t('Signature', 'سرکلید'), e.key[0] || '', v => {
      if (v) e.key[pc] = v;
      else delete e.key[pc];
      sheet()
    }, [
      ['', '♮'], ...Object.keys(e.marks).map(k => [k, k])
    ]),
    offset = field(r, '¢', e.offset[0] || 0, v => e.offset[pc] = v, null, [-1200, 1200, 1]);
  btn(r, '♪', () => voice(freq(e, 60 + pc))(1))
}

function rules() {
  const p = detail(t('Practice settings', 'تنظیم تمرین')),
    r = e.rule;
  const option = (k, s, opts) => field(p, s, r[k], v => r[k] = v, opts),
    num = (k, s, l) => field(p, s, r[k], v => r[k] = v, null, l);
  option('mode', t('Response', 'پاسخ'), [
    ['piano', t('Piano', 'پیانو')],
    ['text', t('Type note', 'نام نت')],
    ['mic', t('Microphone', 'میکروفن')]
  ]);
  option('order', t('Order', 'ترتیب'), [
    ['listen', t('Listen first', 'اول شنیدن')],
    ['answer', t('Answer first', 'اول پاسخ')]
  ]);
  for (const [k, s] of [
      ['staff', t('Show staff', 'نمایش حامل')],
      ['tuner', t('Allow tuner', 'اجازهٔ تیونر')]
    ]) {
    const l = el('label', p, s),
      c = el('input', l);
    c.type = 'checkbox';
    c.checked = r[k];
    c.onchange = () => {
      r[k] = c.checked;
      save()
    }
  }
  num('count', t('Countdown', 'شمارش معکوس'), [0, 30, 1]);
  num('listen', t('Listen (s)', 'شنیدن (ثانیه)'), [.1, 120, .1]);
  num('answer', t('Answer (s)', 'پاسخ (ثانیه)'), [.1, 120, .1]);
  option('ref', t('Reference', 'مرجع'), [
    ['off', '—'],
    ['first', t('At start', 'ابتدا')],
    ['each', t('Every note', 'قبل هر نت')]
  ]);
  option('refMidi', t('Reference pitch', 'نت مرجع'), Array.from({
    length: 60
  }, (_, i) => [36 + i, label(36 + i)]));
  num('repeat', t('Repeats', 'تکرار'), [1, 12, 1]);
  num('refTime', t('Reference (s)', 'مدت مرجع'), [.1, 120, .1])
}

function cancel() {
  if (session) {
    session.dead = true;
    session.mic?.close();
    session = null
  }
  stopKeys();
  if (rec) save();
  rec = null
}

function matchesNote(value, midi) {
  if (typeof value !== 'string') return false;
  let note = value.normalize('NFKC').toUpperCase().replace(/\s+/g, '').replace(/دیز|SHARP|#/g, '♯').replace(/بمل|FLAT/g, '♭').replace(/[۰-۹]/g, x => '۰۱۲۳۴۵۶۷۸۹'.indexOf(x));
  for (const [from, to] of [
      ['SOL', 'G'],
      ['DO', 'C'],
      ['RE', 'D'],
      ['MI', 'E'],
      ['FA', 'F'],
      ['LA', 'A'],
      ['SI', 'B'],
      ['TI', 'B'],
      ['سل', 'G'],
      ['دو', 'C'],
      ['ر', 'D'],
      ['می', 'E'],
      ['فا', 'F'],
      ['لا', 'A'],
      ['سی', 'B']
    ]) note = note.replace(from, to)
  const m = /^([A-G])([♯♭B]?)(-?\d+)?$/.exec(note)
  if (!m) return false
  const pc = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  } [m[1]] + (m[2] === '♯' ? 1 : m[2] ? -1 : 0)
  return m[3] === undefined ? (pc + 12) % 12 === midi % 12 : 12 * (Number(m[3]) + 1) + pc === midi
}

function practice() {
  const p = el('section', app, undefined, 'practice-panel');
  el('h2', p, e.title || t('Your etude', 'اتود شما'));
  if(!e.notes.length){
    el('p',p,t('Open an etude from your teacher to start practicing.','برای شروع، فایل اتود استادت را باز کن.'));
    btn(p,t('Open etude','باز کردن اتود'),()=>$('#file').click()).className='primary';
  } else {
    el('p',p,t('Notes','تعداد نت')+' · '+e.notes.length.toLocaleString(fa?'fa':'en'));
  }
  const start = btn(p, t('Start practice', 'شروع تمرین'), async () => {
    start.disabled = true;
    unlock();
    const s = {
      dead: false
    };
    session = s;
    const r = e.rule;
    try {
      if (r.mode === 'mic' || r.tuner) {
        s.mic = await microphone();
        if (s.dead) {
          s.mic.close();
          return
        }
      }
    } catch {
      if (!s.dead) {
        el('p', p, t('Microphone unavailable. Check permission.', 'دسترسی میکروفن را بررسی کنید.'));
        start.disabled = false
      }
      return
    }
    p.replaceChildren();
    btn(p, t('End practice', 'پایان تمرین'), () => {
      cancel();
      render()
    });
    const counter=el('div',p,undefined,'counter');
    const clock=el('strong',counter),status=el('span',counter),
      progressLabel=el('p',p),
      body = el('div', p);
    status.setAttribute('role','status');
    const results = [];
    async function phase(seconds, name, tick) {
      status.textContent = name;
      const now = performance.now();
      while (!s.dead) {
        const left = Math.max(0, seconds - (performance.now() - now) / 1000);
        clock.textContent = Math.ceil(left).toLocaleString(fa?'fa':'en');
        counter.style.setProperty('--turn', (left/seconds*360)+'deg');
        if (left <= 0 || tick?.()) break;
        await new Promise(done => setTimeout(done, 35))
      }
    }
    const sorted = [...e.notes].sort((a, b) => a.at - b.at);
    if (r.count) await phase(r.count, t('Get ready', 'آماده شو'));
    for (let i = 0; i < sorted.length && !s.dead; i++) {
      const n = sorted[i];
      progressLabel.textContent=t('Note','نت')+' '+(i+1).toLocaleString(fa?'fa':'en')+' / '+sorted.length.toLocaleString(fa?'fa':'en');
      if (r.ref === 'each' || (r.ref === 'first' && !i))
        for (let j = 0; j < r.repeat && !s.dead; j++) {
          voice(freq(e, r.refMidi))(r.refTime);
          await phase(r.refTime + .12, t('Reference', 'مرجع'))
        }
      if (s.dead) return;
      const listen = async () => {
        voice(freq(e, n.m))(r.listen);
        await phase(r.listen, t('Listen', 'گوش کن'))
      };
      if (r.order === 'listen') await listen();
      if (s.dead) return;
      body.replaceChildren();
      if (r.staff) {
        const h = el('div', body, undefined, 'score');
        score(h, {
          ...e,
          notes: [{
            ...n,
            at: 0
          }]
        })
      }
      let answer = null,
        needle = null,
        stable = 0,
        last = null;
      const submit = v => {
        if (answer === null) answer = v
      };
      if (r.mode === 'piano') {
        piano(body, m => {
          submit(m)
        });
      } else if (r.mode === 'text') {
        const f = el('form', body),
          x = el('input', f);
        x.placeholder = t('Note, e.g. C4', 'نام نت، مثلاً C4');
        x.focus();
        const b = el('button', f, t('Submit', 'ثبت'));
        b.type = 'submit';
        f.onsubmit = ev => {
          ev.preventDefault();
          const str = x.value.trim().toUpperCase().replace('#', '♯');
          if (str) submit(str)
        }
      }
      if (r.tuner) {
        const dial = el('div', body, undefined, 'needle');
        dial.setAttribute('aria-label', t('Pitch difference in cents', 'اختلاف کوک به سنت'));
        needle = el('i', dial)
      }
      await phase(r.answer, t('Your turn', 'نوبت تو'), () => {
        const hz = s.mic?.read();
        if (hz) {
          const cents = 1200 * Math.log2(hz / freq(e, n.m));
          if (needle) needle.style.transform = 'rotate(' + Math.max(-85, Math.min(85, cents)) + 'deg)';
          if (r.mode === 'mic') {
            if (last && Math.abs(1200 * Math.log2(hz / last)) < 20) stable++;
            else stable = 0;
            last = hz;
            if (stable >= 4) submit(hz)
          }
        } else stable = 0;
        return answer !== null
      });
      if (s.dead) return;
      const ok = r.mode === 'mic' ? answer !== null && Math.abs(1200 * Math.log2(answer / freq(e, n.m))) <= 35 : r.mode === 'piano' ? answer === n.m : matchesNote(answer, n.m);
      results.push({
        m: n.m,
        answer,
        ok
      });
      stopKeys();
      body.replaceChildren();
      if (r.order === 'answer') await listen()
    }
    if (s.dead) return;
    s.mic?.close();
    session = null;
    p.replaceChildren();
    const count = results.filter(x => x.ok).length;
    el('h2', p, (count === results.length ? '★ ' : count > 0 ? '✦ ' : '') + count + ' / ' + results.length);
    el('p', p, count === results.length ? t('Perfect pitch match!', 'همهٔ پاسخ‌ها درست بود!') : t('Practice complete', 'تمرین به پایان رسید'));
    const log = JSON.parse(localStorage.results || '[]');
    log.push({
      title: e.title,
      time: Date.now(),
      results
    });
    localStorage.results = JSON.stringify(log);
    btn(p, t('Try again', 'تمرین دوباره'), render)
  });
  start.className='primary';start.hidden=!e.notes.length;
  const logs = JSON.parse(localStorage.results || '[]');
  if (logs.length) {
    const h = detail(t('Results', 'نتایج'));
    for (const item of logs.slice(-15).reverse()) {
      const d = el('details', h);
      el('summary', d, item.title + ' · ' + new Date(item.time).toLocaleDateString(fa ? 'fa' : 'en') + ' · ' + item.results.filter(x => x.ok).length + '/' + item.results.length);
      for (const x of item.results) el('div', d, label(x.m) + ' · ' + (x.answer ?? '—') + ' ' + (x.ok ? '✓' : '×'))
    }
  }
}

function routeFromHash(){
  const key=location.hash.slice(1).split('/')[0];
  return ['studio','practice'].includes(key)?key:'home';
}
window.addEventListener('hashchange',()=>{
  const route=routeFromHash();
  cancel();page=route;loadRoute();render();window.scrollTo(0,0);
});


/* The Etudes library is UI only. Existing collection data and Studio actions are reused. */
function renderEtudesGallery(){
  app.classList.add('etudes-library');
  const state={filter:'all',query:'',sort:'recent'};
  const root=el('div',app,undefined,'etudes-page');
  const make=(p,tag,text,cls)=>el(tag,p,text,cls);
  const button=(p,text,cls,fn)=>{const b=make(p,'button',text,cls);b.type='button';b.onclick=fn;return b};
  const create=()=>{location.hash='studio/'+addEtude(fresh(),'own')};
  const open=id=>{location.hash='studio/'+id};
  const fmt=n=>n.toLocaleString(fa?'fa-IR':'en-US');
  const title=data=>data.title||t('Untitled etude','اتود بدون نام');
  const origin=entry=>entry.origin==='imported'?t('Imported','واردشده'):t('Personal','شخصی');
  const seconds=data=>Math.max(0,...data.notes.map(n=>n.at+n.d));
  const duration=data=>{const n=seconds(data);return n?Math.floor(n/60)?fmt(Math.floor(n/60))+' '+t('min','دقیقه')+' '+fmt(Math.round(n%60))+' '+t('sec','ثانیه'):fmt(Math.round(n))+' '+t('sec','ثانیه'):t('Not timed','بدون زمان‌بندی')};

  function scoreArt(host,data,large=false){
    const stage=make(host,'div',undefined,'etudes-score'+(large?' etudes-score-large':''));
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 460 150');svg.setAttribute('aria-hidden','true');stage.append(svg);
    const draw=(tag,props,text)=>{const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;svg.append(node);return node};
    for(let i=0;i<5;i++)draw('line',{x1:20,x2:440,y1:37+i*15,y2:37+i*15,class:'etudes-score-line'});
    draw('text',{x:27,y:103,class:'etudes-score-clef'},'𝄞');
    const positions=[0,0,1,1,2,3,3,4,4,5,5,6];
    const step=m=>Math.floor(m/12)*7+positions[m%12];
    const notes=[...data.notes].sort((a,b)=>a.at-b.at).slice(0,8);
    if(!notes.length){draw('text',{x:252,y:81,'text-anchor':'middle',class:'etudes-score-empty'},t('Your next melody starts here','جای اولین نت تو'));return}
    notes.forEach((note,i)=>{
      const x=106+i*43,y=Math.max(20,Math.min(127,97-(step(note.m)-step(64))*7.5));
      draw('ellipse',{cx:x,cy:y,rx:10,ry:6,transform:'rotate(-20 '+x+' '+y+')',class:'etudes-score-note'});
      draw('line',{x1:x+9,y1:y,x2:x+9,y2:y-44,class:'etudes-score-stem'});
      if([1,3,6,8,10].includes(note.m%12))draw('text',{x:x-22,y:y+4,class:'etudes-score-sharp'},'♯');
      if(y>100)for(let yy=112;yy<=y+3;yy+=15)draw('line',{x1:x-13,x2:x+13,y1:yy,y2:yy,class:'etudes-score-line'});
      if(y<37)for(let yy=22;yy>=y-3;yy-=15)draw('line',{x1:x-13,x2:x+13,y1:yy,y2:yy,class:'etudes-score-line'});
    });
  }

  const hero=make(root,'section',undefined,'etudes-hero');
  const copy=make(hero,'div',undefined,'etudes-hero-copy');
  make(copy,'span',t('YOUR MUSIC LIBRARY','کتابخانه موسیقی تو'),'etudes-kicker');
  make(copy,'h1',t('Etudes','اتودها'));
  make(copy,'p',t('Create, browse and manage the etudes saved on your device.','اتودهای خودت را بساز، مرور کن و منظم نگه دار.'));
  const heroActions=make(hero,'div',undefined,'etudes-hero-actions');
  button(heroActions,t('Import etude','وارد کردن اتود'),'etudes-btn etudes-btn-outline',()=>$('#file').click());
  button(heroActions,t('+ Create new etude','+ ساخت اتود جدید'),'etudes-btn etudes-btn-primary',create);
  const floating=button(root,t('+ New etude','+ اتود جدید'),'etudes-create-mobile',create);
  floating.setAttribute('aria-label',t('Create new etude','ساخت اتود جدید'));

  const tools=make(root,'section',undefined,'etudes-tools');
  const search=make(tools,'label',undefined,'etudes-search');
  make(search,'span','⌕','etudes-search-icon');
  const input=make(search,'input');
  input.type='search';input.placeholder=t('Search your etudes','جستجو در اتودها');input.setAttribute('aria-label',t('Search etudes','جستجوی اتودها'));
  input.oninput=()=>{state.query=input.value.trim().toLocaleLowerCase();update()};
  const filters=make(tools,'div',undefined,'etudes-filters');
  filters.setAttribute('role','group');filters.setAttribute('aria-label',t('Etude filters','فیلترهای اتود'));
  const choices=[['all',t('All etudes','همه اتودها')],['mine',t('My etudes','اتودهای من')],['imported',t('Imported','واردشده')],['filled',t('With notes','دارای نت')]];
  const tabButtons=choices.map(([key,label])=>[key,button(filters,label,'etudes-filter',()=>{state.filter=key;update()})]);
  const ordering=make(tools,'label',undefined,'etudes-order');
  make(ordering,'span',t('Sort','مرتب‌سازی'));
  const select=make(ordering,'select');
  for(const [value,text] of [['recent',t('Recently added','تازه‌ترین')],['title',t('Title','نام اتود')],['notes',t('Most notes','بیشترین نت')]]){
    const option=make(select,'option',text);option.value=value;
  }
  select.onchange=()=>{state.sort=select.value;update()};

  const library=make(root,'section',undefined,'etudes-library-section');
  const heading=make(library,'div',undefined,'etudes-library-head');
  const libraryName=make(heading,'h2');
  const libraryCount=make(heading,'span',undefined,'etudes-result-count');
  const cards=make(library,'div',undefined,'etudes-card-grid');

  function preview(id,entry){
    const d=document.createElement('dialog');d.className='etudes-preview-dialog';document.body.append(d);
    const head=make(d,'div',undefined,'etudes-preview-head'),left=make(head,'div');
    make(left,'span',t('ETUDE PREVIEW','پیش‌نمایش اتود'),'etudes-kicker');
    make(left,'h2',title(entry.data));
    const close=button(head,'×','etudes-preview-close',()=>d.close());
    close.setAttribute('aria-label',t('Close','بستن'));
    scoreArt(d,entry.data,true);
    const facts=make(d,'div',undefined,'etudes-preview-facts');
    for(const [key,value] of [[t('Source','منبع'),origin(entry)],[t('Notes','نت‌ها'),fmt(entry.data.notes.length)],[t('Tempo','تمپو'),fmt(entry.data.bpm)+' BPM'],[t('Duration','مدت'),duration(entry.data)]]){
      const fact=make(facts,'div');make(fact,'strong',value);make(fact,'small',key);
    }
    make(d,'p',t('Open in Studio to edit or share this etude as a file.','برای ویرایش یا اشتراک‌گذاری فایل، اتود را در استودیو باز کن.'),'etudes-preview-footnote');
    const actions=make(d,'div',undefined,'etudes-preview-actions');
    button(actions,t('Close','بستن'),'etudes-btn etudes-btn-outline',()=>d.close());
    button(actions,t('Open in Studio','باز کردن در استودیو'),'etudes-btn etudes-btn-primary',()=>{d.close();open(id)});
    d.addEventListener('close',()=>d.remove(),{once:true});
    d.showModal();
  }

  function update(){
    for(const [key,btn] of tabButtons){const active=state.filter===key;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active))}
    let items=[...collection.entries()].reverse();
    if(state.filter==='mine')items=items.filter(([,v])=>v.origin!=='imported');
    if(state.filter==='imported')items=items.filter(([,v])=>v.origin==='imported');
    if(state.filter==='filled')items=items.filter(([,v])=>v.data.notes.length>0);
    if(state.query)items=items.filter(([,v])=>title(v.data).toLocaleLowerCase().includes(state.query));
    if(state.sort==='title')items.sort((a,b)=>title(a[1].data).localeCompare(title(b[1].data),fa?'fa':'en'));
    if(state.sort==='notes')items.sort((a,b)=>b[1].data.notes.length-a[1].data.notes.length);
    libraryName.textContent=state.filter==='mine'?t('My etudes','اتودهای من'):state.filter==='imported'?t('Imported etudes','اتودهای واردشده'):t('Your collection','مجموعه اتودها');
    libraryCount.textContent=fmt(items.length)+' '+t('etudes','اتود');
    cards.replaceChildren();
    if(!items.length){
      const empty=make(cards,'div',undefined,'etudes-empty');
      make(empty,'span','♫','etudes-empty-symbol');
      make(empty,'h3',collection.size?t('No matching etudes','اتودی پیدا نشد'):t('Start with your first etude','اولین اتودت را بساز'));
      make(empty,'p',collection.size?t('Try another search or filter.','جستجو یا فیلتر دیگری را امتحان کن.'):t('Create a new etude or import a file to begin.','یک اتود جدید بساز یا فایل وارد کن.'));
      if(!collection.size)button(empty,t('Create etude','ساخت اتود'),'etudes-btn etudes-btn-primary',create);
      return;
    }
    for(const [id,entry] of items){
      const data=entry.data,card=make(cards,'article',undefined,'etudes-card');
      const thumb=button(card,'','etudes-card-thumbnail',()=>preview(id,entry));
      thumb.setAttribute('aria-label',t('Preview: ','پیش‌نمایش: ')+title(data));
      scoreArt(thumb,data);
      make(thumb,'span',origin(entry),'etudes-origin'+(entry.origin==='imported'?' is-imported':''));
      const body=make(card,'div',undefined,'etudes-card-details');
      make(body,'h3',title(data));
      const meta=make(body,'div',undefined,'etudes-card-metadata');
      make(meta,'span',fmt(data.notes.length)+' '+t('notes','نت'));
      make(meta,'span',fmt(data.bpm)+' BPM');
      const foot=make(card,'div',undefined,'etudes-card-footer');
      make(foot,'span',duration(data));
      button(foot,t('Open','باز کردن'),'etudes-card-open',()=>open(id)).setAttribute('aria-label',t('Open: ','باز کردن: ')+title(data));
    }
  }
  update();
}

function etudeList(){
  const actions=row(app);
  if(page==='studio')btn(actions,t('New etude','ساخت اتود'),()=>{
    location.hash='studio/'+addEtude(fresh(),'own');
  }).className='primary';
  btn(actions,t('Import etude','وارد کردن اتود'),()=>$('#file').click());
  const grid=el('div',app,undefined,'shelves');
  for(const [origin,title] of [['own',t('My etudes','اتودهای من')],['imported',t('Imported etudes','اتودهای واردشده')]]){
    const section=el('section',grid);
    el('h2',section,title);
    const entries=[...collection.entries()].filter(([,entry])=>entry.origin===origin);
    if(!entries.length)el('p',section,origin==='own'?t('No etudes created yet.','هنوز اتودی نساخته‌اید.'):t('No files imported yet.','هنوز فایلی وارد نکرده‌اید.'));
    for(const [id,entry] of entries.reverse()){
      const item=el('button',section,undefined,'etude-item');
      el('strong',item,entry.data.title||t('Untitled etude','اتود بدون نام'));
      el('small',item,entry.data.notes.length.toLocaleString(fa?'fa':'en')+' '+t('notes','نت'));
      item.onclick=()=>{location.hash=page+'/'+id};
    }
  }
}

function render() {
  document.documentElement.lang = fa ? 'fa' : 'en';
  document.documentElement.dir = fa ? 'rtl' : 'ltr';
  document.documentElement.classList.toggle('dark', dark);
  $('#theme').title = t('Change theme', 'تغییر پوسته');
  $('#lang').textContent = fa ? 'English' : 'فارسی';
  const nav = $('#nav');
  nav.replaceChildren();
  const routes = [['home',t('Home','خانه')],['studio',t('Etude studio','استودیوی اتود')],['practice',t('Practice','تمرین')]];
  const navigate = key => { if(location.hash!=='#'+key)location.hash=key };
  const footer=$('#footer') || el('footer',document.body);
  footer.id='footer';
  footer.replaceChildren();
  const brand=el('div',footer,undefined,'footer-brand');
  for(const theme of ['light','dark']){const logo=el('img',brand);logo.className='wordmark '+theme+'-logo';logo.alt='Goosh';logo.src='brand/goosh-wordmark-'+theme+'.png'}
  const footNav=el('nav',footer);footNav.setAttribute('aria-label',t('Footer navigation','پیوندهای پایین صفحه'));
  nav.setAttribute('aria-label',t('Main navigation','ناوبری اصلی'));
  for(const [key,name] of routes){
    const item=btn(nav,name,()=>navigate(key));
    item.dataset.route=key;
    if(key===page){item.className='active';item.setAttribute('aria-current','page')}
    btn(footNav,name,()=>navigate(key));
  }
  app.replaceChildren();
  app.dataset.page=page;
  document.body.classList.toggle('home-screen',page==='home');
  const name=routes.find(([key])=>key===page)[1];
  document.title=name+' · Goosh';
  if(page!=='home' && !(page==='studio' && !activeId))el('h1',app,name);
  if(page==='home'){
    renderHome({
      el,app,t,collection,navigate,
      createEtude:()=>{location.hash='studio/'+addEtude(fresh(),'own')},
      importEtude:()=>$('#file').click()
    });
  }else if(!activeId){
    if(page==='studio')renderEtudesGallery();
    else etudeList();
  }else{
    btn(row(app),t('Back to list','بازگشت به فهرست'),()=>navigate(page));
    if(page==='studio')studio();else practice();
  }
}
$('#lang').onclick = () => {
  cancel();
  fa = !fa;
  localStorage.lang = fa ? 'fa' : 'en';
  render()
};
$('#theme').onclick = () => {
  dark = !dark;
  localStorage.theme = dark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', dark)
}
$('#file').onchange = async ev => {
  try {
    const f = ev.target.files[0];
    if (!f) return;
    const data = JSON.parse(await f.text());
    if (!valid(data)) throw Error();
    const id=addEtude(data,'imported');
    location.hash=(page==='practice'?'practice':'studio')+'/'+id;
  } catch {
    alert(t('Invalid etude file', 'فایل اتود معتبر نیست'))
  } finally {
    ev.target.value = ''
  }
}
window.addEventListener('blur', stopKeys);
window.addEventListener('resize', () => {
  if (page === 'studio') sheet()
});
document.onkeydown = ev => {
  if(document.querySelector('dialog[open]'))return;
  if (ev.repeat || ev.ctrlKey || ev.altKey || ev.metaKey || /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
  const key = document.querySelector('[data-shortcut="' + ev.code + '"]');
  if (key) {
    ev.preventDefault();
    key.begin(ev.code, ev.timeStamp);
    return
  }
  if (page !== 'studio') return;
  if (ev.code === 'KeyR') $('[data-record]')?.click();
  if (ev.code === 'Delete') $('[data-del]')?.click()
};
render()

document.onkeyup = ev => held.get(ev.code)?.()
