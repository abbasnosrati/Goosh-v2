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
  microphone
} from './audio.js'
import {
  score
} from './score.js'
const $ = s => document.querySelector(s),
  app = $('#app');
let fa = localStorage.lang !== 'en',
  dark = localStorage.theme === 'dark',
  page = 'studio',
  e = fresh(),
  rec = null,
  pen = false,
  zoom = 1,
  wrap = true,
  oct = 4,
  sel = new Set(),
  held = new Map(),
  session = null
try {
  const saved = JSON.parse(localStorage.etude);
  if (valid(saved)) e = saved
} catch {}
const t = (en, ir) => fa ? ir : en,
  save = () => localStorage.etude = JSON.stringify(e),
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
  const p = el('div', parent);
  const r = row(p);
  field(r, t('Octave', 'اکتاو'), oct, v => {
    stopKeys();
    oct = v;
    p.remove();
    piano(parent, onStart)
  }, [0, 1, 2, 3, 4, 5, 6, 7].map(v => [v, v]));
  const box = el('div', el('div', p, undefined, 'keys'), undefined, 'board');
  let white = 0;
  for (let j = 0; j < 24; j++) {
    const m = 12 * (oct + 1) + j,
      black = names[m % 12].includes('♯'),
      b = el('button', box, black ? '' : label(m));
    const shortcut = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K', 'O', 'L', 'P'][j];
    b.title = label(m) + (shortcut ? ' (' + shortcut + ')' : '');
    if (shortcut) b.dataset.shortcut = 'Key' + shortcut;
    b.ariaLabel = label(m);
    if (black) {
      b.className = 'black';
      b.style.left = (white / 14 * 100 - 2.2) + '%'
    } else white++;
    b.begin = (id, at) => {
      const off = voice(freq(e, m));
      const release = onStart(m, at);
      b.classList.add('down');
      held.set(id, () => {
        held.delete(id);
        b.classList.remove('down');
        const d = (performance.now() - at) / 1000;
        off(d < .18 ? 2 : Math.min(6, d));
        release?.(Math.max(.001, d))
      })
    };
    b.onpointerdown = ev => {
      ev.preventDefault();
      b.setPointerCapture(ev.pointerId);
      b.begin(ev.pointerId, ev.timeStamp)
    };
    b.onlostpointercapture = b.onpointerup = b.onpointercancel = ev => held.get(ev.pointerId)?.()
  }
}

function sheet() {
  const h = $('.score');
  if (h) score(h, e, {
    zoom,
    wrap,
    selected: sel,
    pick: i => {
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

function studio() {
  const heading = el('h2', app, e.title || t('Untitled etude', 'اتود بدون نام'), 'print-title');
  const top = row(app);
  btn(top, t('New etude', 'اتود جدید'), () => {
    if (e.notes.length && !confirm(t('Start a new etude? Export this one to keep a copy.', 'اتود جدید بسازید؟ برای نگهداری این اتود ابتدا خروجی بگیرید.'))) return;
    cancel();
    e = fresh();
    sel.clear();
    save();
    render()
  });
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
  record.dataset.record = '';

  function toggle() {
    stopKeys();
    if (rec) rec = null;
    else {
      unlock();
      rec = {
        start: performance.now(),
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
  piano(panel, (m, at) => {
    if (!rec) return;
    const n = {
      m,
      at: rec.base + (at - rec.start) / 1000,
      d: .001
    };
    e.notes.push(n);
    requestAnimationFrame(sheet);
    return d => {
      n.d = d;
      save();
      sheet()
    }
  });
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
  const p = el('section', app);
  el('h2', p, e.title || t('Etude', 'اتود'));
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
    const status = el('h2', p),
      clock = el('span', p),
      bar = el('progress', p),
      body = el('div', p);
    const results = [];
    async function phase(seconds, name, tick) {
      status.textContent = name;
      const now = performance.now();
      while (!s.dead) {
        const left = Math.max(0, seconds - (performance.now() - now) / 1000);
        clock.textContent = Math.ceil(left) + ' ';
        bar.value = 1 - left / seconds;
        if (left <= 0 || tick?.()) break;
        await new Promise(done => setTimeout(done, 35))
      }
    }
    const sorted = [...e.notes].sort((a, b) => a.at - b.at);
    if (r.count) await phase(r.count, t('Get ready', 'آماده شو'));
    for (let i = 0; i < sorted.length && !s.dead; i++) {
      const n = sorted[i];
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
  start.disabled = !e.notes.length;
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

function render() {
  document.documentElement.lang = fa ? 'fa' : 'en';
  document.documentElement.dir = fa ? 'rtl' : 'ltr';
  document.documentElement.classList.toggle('dark', dark);
  $('#theme').title = t('Change theme', 'تغییر پوسته');
  $('#lang').textContent = fa ? 'English' : 'فارسی';
  const nav = $('#nav');
  nav.replaceChildren();
  for (const [key, s] of [
      ['studio', t('Studio', 'استودیو')],
      ['practice', t('Practice', 'تمرین')]
    ]) btn(nav, s, () => {
    cancel();
    page = key;
    render()
  }).classList.toggle('active', page === key);
  app.replaceChildren();
  el('h1', app, page === 'studio' ? t('Etude studio', 'استودیوی اتود') : t('Practice', 'تمرین'));
  btn(row(app), t('Import etude', 'ورود اتود'), () => $('#file').click());
  if (page === 'studio') studio();
  else practice()
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
    if (e.notes.length && !confirm(t('Replace current etude?', 'اتود فعلی جایگزین شود؟'))) return;
    cancel();
    e = data;
    sel.clear();
    save();
    render()
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
