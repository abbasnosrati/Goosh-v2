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
  microphone,
  createScoreOutput
} from './audio.js?v=score-transport-1'
import {
  score
} from './score.js?v=staff-persian-align-1'
import {SIGNATURE_PITCHES,SIGNATURE_MARKS,drawKeySignatureEditor}
  from './key-signature.js?v=koron-align-a4-1'
import {isPersianAccidental, appendPersianAccidental}
  from './persian-accidentals.js?v=persian-marks-1'
import { mountEtudeComposer } from './studio-etude-generation.js?v=practice-flow-2'
import { renderStudioPractice, setStudioPracticeLocked } from './studio-practice.js?v=practice-flow-2'
import { renderHome } from './home.js?v=clean-routes-1';
import {readRoute,navigateTo,listenToRoutes,upgradeLegacyHash} from './router.js';
import {installAndroidBackNavigation} from './native-navigation.js';
import {applyMusicSignature} from './music-signature.js';

// Canonicalize older /#studio and /#practice links before state initialization.
upgradeLegacyHash();
const $ = s => document.querySelector(s),
  app = $('#app');
let fa = localStorage.lang !== 'en',
  dark = localStorage.theme === 'dark',
  page = readRoute().page,
  e = fresh(),
  rec = null,
  scoreTool = 'select',
  signatureMode = false,
  signaturePitch = 0,
  signaturePreviewRelease = null,
  signaturePreviewTime = -Infinity,
  zoom = 1,
  wrap = true,
  oct = 4,
  sel = new Set(),
  held = new Map(),
  session = null,
  playback = null,
  scoreTransport = null,
  scoreUndoStack = [],
  practiceToExpand = null
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
  const id=readRoute().id;
  activeId=page!=='home' && collection.has(id)?id:null;
  e=activeId?collection.get(activeId).data:fresh();
  sel.clear();
  scoreTool='select';
  signatureMode=false;
  signaturePitch=0;
  scoreUndoStack.length=0;
  practiceToExpand=null;
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

// Read the Web Audio clock so the notation marker follows scheduled sound,
// including expressive rests and simultaneous notes. No transport changes.
function paintPlaybackMarker(force = false) {
  if (!playback) return;
  const elapsed = playback.clock.currentTime - playback.started;
  const active = new Set(playback.notes.filter(n =>
    elapsed >= n.at && elapsed < n.at + n.d).map(n => n.index));
  const signature = [...active].join(',');
  if (!force && signature === playback.markerSignature) return;
  playback.markerSignature = signature;
  $('.score')?.querySelectorAll('[data-playback-note]').forEach(marker => {
    const index = Number(marker.getAttribute('data-playback-note'));
    marker.setAttribute('opacity', active.has(index) ? '1' : '0');
  });
}

function clearPlaybackMarker() {
  if (!playback) return;
  cancelAnimationFrame(playback.frame);
  playback = null;
  $('.score')?.querySelectorAll('[data-playback-note]').forEach(marker => {
    marker.setAttribute('opacity', '0');
  });
}

function advancePlaybackMarker() {
  if (!playback) return;
  const current = playback;
  paintPlaybackMarker();
  if (current.clock.currentTime - current.started >= current.end) {
    clearPlaybackMarker();
  } else {
    current.frame = requestAnimationFrame(advancePlaybackMarker);
  }
}

// Studio-only undo history for Pen insertion and Eraser deletion.
// Keep references to the edited notes array to avoid reverting a replaced etude.
function rememberScoreEdit(action) {
  scoreUndoStack.push({...action, etudeId:activeId, notes:e.notes});
  if (scoreUndoStack.length > 100) scoreUndoStack.shift();
}

function undoScoreEdit() {
  if (page!=='studio' || !activeId || rec || !scoreUndoStack.length) return false;
  const action=scoreUndoStack[scoreUndoStack.length-1];
  if (action.etudeId!==activeId || action.notes!==e.notes) {
    scoreUndoStack.length=0;
    return false;
  }
  if (action.kind==='pen') {
    const i=e.notes.indexOf(action.note);
    if (i<0) {scoreUndoStack.pop();return false;}
    stopScorePlayback();
    e.notes.splice(i,1);
  } else if (action.kind==='erase') {
    if (e.notes.includes(action.note)) {scoreUndoStack.pop();return false;}
    stopScorePlayback();
    e.notes.splice(Math.min(action.index,e.notes.length),0,action.note);
  } else return false;
  scoreUndoStack.pop();
  sel.clear();
  save();
  sheet();
  return true;
}

// This editor writes into the existing global key/offset model used by freq().
function stopSignaturePreview(){
  if(signaturePreviewRelease){
    try{signaturePreviewRelease(0)}catch{}
    signaturePreviewRelease=null
  }
  signaturePreviewTime=-Infinity
}

function auditionSignature(hz,force=false){
  const now=performance.now()
  if(!force&&now-signaturePreviewTime<140)return
  stopSignaturePreview()
  signaturePreviewTime=now
  signaturePreviewRelease=voice(hz)
  signaturePreviewRelease(.55)
}

function renderSignatureControls(){
  const box=$('.signature-editor-controls')
  if(!box)return
  box.hidden=!signatureMode
  box.replaceChildren()
  if(!signatureMode)return
  const selected=SIGNATURE_PITCHES.find(p=>p.pc===signaturePitch)
  if(!selected)return
  const pc=selected.pc,mark=e.key[pc]||''
  const base=e.marks[mark]||0
  const effective=base+(e.offset[pc]||0)
  el('strong',box,selected.name+' · '+t('Key signature','سرکلید'),
    'signature-editor-selected')
  const marks=el('div',box,undefined,'signature-editor-marks')
  for(const {mark:option,glyph,en,fa:ir} of SIGNATURE_MARKS){
    const button=btn(marks,isPersianAccidental(option)?'':glyph,()=>{
      if((e.key[pc]||'')===option&&!e.offset[pc])return
      stopSignaturePreview()
      stopScorePlayback()
      if(option)e.key[pc]=option
      else delete e.key[pc]
      delete e.offset[pc]
      save()
      sheet()
    },t(en,ir))
    button.className='signature-editor-mark'
    if(option===mark)button.classList.add('active')
    button.setAttribute('aria-label',t(en,ir))
    button.setAttribute('aria-pressed',String(option===mark))
    if(option===''){
      // Keep the natural sign optically centered without affecting any
      // other symbol or the existing selection/clear-key behavior.
      button.classList.add('signature-natural-mark')
      button.textContent=''
      el('span',button,glyph,'signature-natural-symbol')
    }
    if(isPersianAccidental(option)){
      button.classList.add('signature-microtonal')
      // Match the optical height of the unchanged flat/sharp symbols.
      appendPersianAccidental(button,option,{width:18,height:22})
    }
  }
  // Compact, unboxed tuning controls; selected pitch is already identified
  // in the key-signature editor, so no duplicate headings are needed.
  const card=el('div',box,undefined,'signature-tuner-inline')

  const readout=el('div',card,undefined,'signature-tuner-readout')
  const centsValue=el('strong',readout,undefined,'signature-tuner-value')

  const scale=el('div',card,undefined,'signature-tuner-scale')
  const frequency=el('span',scale,undefined,'signature-tuner-frequency')
  const slider=el('input',scale,undefined,'signature-tuning-slider')
  slider.type='range'
  slider.step='1'
  slider.setAttribute('aria-label',t('Tune pitch in cents','تنظیم کوک نت برحسب سنت'))
  const ticks=el('div',scale,undefined,'signature-tuner-ticks')
  ticks.setAttribute('aria-hidden','true')

  const adjust=el('div',card,undefined,'signature-tuner-adjust')
  const down=btn(adjust,'−',()=>setAndSave(currentCents()-1),t('Lower pitch by one cent','کاهش کوک به اندازه یک سنت'))
  down.className='signature-tuner-step'
  const input=el('input',adjust,undefined,'signature-tuning-number')
  input.type='number'
  input.required=true
  input.min='-1200'
  input.max='1200'
  input.step='1'
  input.inputMode='numeric'
  input.setAttribute('aria-label',t('Pitch tuning in cents','کوک نت برحسب سنت'))
  const up=btn(adjust,'+',()=>setAndSave(currentCents()+1),t('Raise pitch by one cent','افزایش کوک به اندازه یک سنت'))
  up.className='signature-tuner-step'

  const actions=el('div',card,undefined,'signature-tuner-actions')
  const reset=btn(actions,'↺ '+t('Reset','بازنشانی'),()=>setAndSave(base),
    t('Reset to this signature mark’s default tuning','بازگرداندن کوک پیش‌فرض علامت سرکلید'))
  reset.className='signature-tuner-reset'
  // This is the pitch in its natural tuning, independent of e.key/e.offset.
  const original=btn(actions,selected.name,()=>{
    auditionSignature(440*2**((selected.midi-69)/12),true)
  },t('Play original natural note','شنیدن صدای طبیعی نت'))
  original.className='signature-editor-listen signature-editor-original'
  original.setAttribute('aria-label',t('Play original natural note','شنیدن صدای طبیعی نت')+' '+selected.name)
  original.prepend(scoreTransportIcon('play'))
  const tuned=btn(actions,'',()=>{
    auditionSignature(freq(e,selected.midi),true)
  },t('Listen to tuned note','شنیدن نت با کوک تنظیم‌شده'))
  tuned.className='signature-editor-listen signature-editor-tuned'
  const tunedLabel=el('span',tuned,undefined,'signature-preview-label')
  tuned.prepend(scoreTransportIcon('play'))

  const currentCents=()=>base+(e.offset[pc]||0)
  const formatSigned=n=>(n>0?'+':'')+n
  const updateReadout=value=>{
    centsValue.textContent=formatSigned(value)+' ¢'
    const hz=freq(e,selected.midi).toFixed(2)
    frequency.textContent=hz+' Hz'
    tunedLabel.textContent=selected.name+' · '+hz+' Hz'
    tuned.setAttribute('aria-label',t('Play tuned note','پخش نت کوک‌شده')+' '+selected.name+' · '+hz+' Hz')
    slider.style.setProperty('--tuning-progress',
      ((value-Number(slider.min))/(Number(slider.max)-Number(slider.min)||1)*100)+'%')
  }
  const updateSliderRange=value=>{
    // Keep a fine-tuning range around the accidental's default setting,
    // but still represent values entered directly in the numeric field.
    const min=Math.max(-1200,Math.min(base-100,value))
    const max=Math.min(1200,Math.max(base+100,value))
    slider.min=String(min)
    slider.max=String(max)
    ticks.replaceChildren()
    for(let i=0;i<5;i++){
      const tick=Math.round(min+(max-min)*i/4)
      el('span',ticks,formatSigned(tick)+'¢')
    }
  }
  const applyCents=value=>{
    const delta=value-(e.marks[e.key[pc]]||0)
    if(!Number.isInteger(value)||value < -1200||value > 1200||
        delta < -1200||delta > 1200)return false
    stopScorePlayback()
    if(delta)e.offset[pc]=delta
    else delete e.offset[pc]
    return true
  }
  const setAndSave=value=>{
    if(!applyCents(value))return false
    if(value<Number(slider.min)||value>Number(slider.max))
      updateSliderRange(value)
    slider.value=String(value)
    input.value=String(value)
    updateReadout(value)
    save()
    auditionSignature(freq(e,selected.midi),true)
    return true
  }

  updateSliderRange(effective)
  slider.value=String(effective)
  input.value=String(effective)
  updateReadout(effective)
  slider.oninput=()=>{
    const value=Number(slider.value)
    if(!applyCents(value))return
    input.value=String(value)
    updateReadout(value)
    // Throttled, short preview while dragging; no duplicated audio voices.
    auditionSignature(freq(e,selected.midi))
  }
  slider.onchange=()=>{
    const value=Number(slider.value)
    if(!applyCents(value))return
    input.value=String(value)
    updateReadout(value)
    save()
    auditionSignature(freq(e,selected.midi),true)
  }
  input.onchange=()=>{
    const value=Number(input.value)
    if(!input.value||!input.reportValidity()||!setAndSave(value))
      input.value=String(currentCents())
  }

}

function sheet() {
  const h = $('.score');
  if (!h) return;
  if(signatureMode){
    h.dataset.view='signature';
    h.dataset.tool='select';
    h.style.removeProperty('--score-tool-cursor');
    drawKeySignatureEditor(h,e,{selectedPc:signaturePitch,
      onSelect:pc=>{stopSignaturePreview();signaturePitch=pc;sheet()}});
    renderSignatureControls();
    return;
  }
  h.dataset.view='notes';
  h.dataset.tool = scoreTool;
  if (scoreTool === 'pen' || scoreTool === 'eraser')
    h.style.setProperty('--score-tool-cursor', scoreEditingCursor(scoreTool));
  else h.style.removeProperty('--score-tool-cursor');
  score(h, e, {
    zoom,
    wrap,
    selected: sel,
    pick: (i, multi) => {
      if (rec) return;
      if (scoreTool === 'eraser') {
        if (i < 0 || i >= e.notes.length) return;
        stopScorePlayback();
        const [removed] = e.notes.splice(i, 1);
        rememberScoreEdit({kind:'erase', note:removed, index:i});
        sel.clear();
        save();
        sheet();
        return;
      }
      if (scoreTool !== 'select') return;
      if (!multi) { sel.clear(); sel.add(i); sheet(); noteSettings(e.notes[i]); return; }
      if (sel.has(i)) sel.delete(i);
      else sel.add(i);
      sheet();
    },
    insert: (m, at) => {
      if (scoreTool === 'pen') {
        const note = {m, at, d:60 / e.bpm};
        e.notes.push(note);
        rememberScoreEdit({kind:'pen', note});
        save();
        sheet();
      }
    }
  });
  paintPlaybackMarker(true);
  renderSignatureControls();
}

// Retiming a note must move subsequent note ONSETS, not only its audio release.
// Preserve existing silence gaps and same-onset chords without quantizing notes.
function retimeNote(note, newDuration, newRest, restChanged) {
  const onset = note.at;
  const previousEnd = e.notes.filter(n => n.at < onset)
    .reduce((end, n) => Math.max(end, n.at + n.d), 0);
  const restShift = restChanged ? previousEnd + newRest - onset : 0;
  const durationShift = newDuration - note.d;
  const proposed = e.notes.map(n => ({
    note: n,
    at: n.at + (n.at >= onset ? restShift : 0) +
      (n.at > onset ? durationShift : 0)
  }));
  // An earlier overlapping note can make a large shortening invalid.
  // Reject it rather than silently moving notes to negative time.
  if (proposed.some(({at}) => !Number.isFinite(at) || at < 0 || at > 1e7))
    return false;
  stopScorePlayback();
  for (const {note: n, at} of proposed) n.at = at;
  note.d = newDuration;
  save();
  sheet();
  return true;
}

// A BPM change is a GLOBAL time-scale edit, including rests and note lengths.
// Preserve the exact beat relationships and piano pitch. Do not time-stretch
// or artificially sustain a decaying piano sample.
function setEtudeTempo(nextBpm) {
  if (!Number.isInteger(nextBpm) || nextBpm < 20 || nextBpm > 300)
    return false;
  if (nextBpm === e.bpm) return true;
  const ratio = e.bpm / nextBpm;
  if (e.notes.some(n => n.at * ratio > 1e7 || n.d * ratio > 1e5))
    return false;
  stopScorePlayback(); // Existing scheduled audio must not retain old timing.
  for (const n of e.notes) {
    n.at *= ratio;
    n.d *= ratio;
  }
  e.bpm = nextBpm;
  save();
  sheet();
  return true;
}

function noteSettings(note) {
  const earlier = e.notes.filter(n => n.at < note.at);
  const precedingEnd = earlier.reduce((end,n) => Math.max(end,n.at+n.d),0);
  const rest = Math.max(0,note.at-precedingEnd);
  const dialog = el('dialog', document.body);
  const heading = el('h2',dialog,t('Note settings','تنظیمات نت')+' · '+(note.displayPitch || label(note.m)));
  dialog.setAttribute('aria-label',heading.textContent);
  const duration = field(dialog,t('Duration (s)','کشش (ثانیه)'),+note.d.toFixed(3),()=>{},null,[.001,100000,'any']);
  const silence = field(dialog,t('Rest before note (s)','سکوت پیش از نت (ثانیه)'),+rest.toFixed(3),()=>{},null,[0,100000,'any']);
  const initialRest = silence.value;
  el('p', dialog, t(
    'Changing a note’s duration moves later notes, preserving the existing gaps.',
    'با تغییر کشش این نت، نت‌های بعدی جابه‌جا می‌شوند و فاصله‌های سکوت حفظ می‌شوند.'
  ), 'note-timing-hint');
  const actions = row(dialog);
  btn(actions,t('Save','ذخیره'),()=>{
    if (!duration.reportValidity() || !silence.reportValidity()) return;
    const length = Number(duration.value), before = Number(silence.value);
    if (!Number.isFinite(length) || length < .001 || length > 1e5 ||
        !Number.isFinite(before) || before < 0 || before > 1e5) return;
    if (!retimeNote(note, length, before, silence.value !== initialRest)) {
      duration.setCustomValidity(t(
        'This change would place a note before the beginning of the etude.',
        'این تغییر باعث می‌شود نتی قبل از ابتدای قطعه قرار بگیرد.'
      ));
      duration.reportValidity();
      duration.setCustomValidity('');
      return;
    }
    dialog.close();
  });
  btn(actions,t('Cancel','انصراف'),()=>dialog.close());
  dialog.onclose=()=>dialog.remove();
  dialog.showModal();
}


// One context-sensitive pictogram: a key signature on the notes view,
// and a plain musical staff when already editing the key signature.
// Use the same actual treble-clef musical symbol already used on the staff.
// The editor-switch control keeps its existing accessible, contextual label.
function scoreSignatureIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 32 34');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const clef = document.createElementNS(ns, 'text');
  clef.setAttribute('x', '16');
  clef.setAttribute('y', '25');
  clef.setAttribute('text-anchor', 'middle');
  clef.setAttribute('font-size', '19');
  clef.setAttribute('font-family', '"Noto Music","Bravura","Segoe UI Symbol",serif');
  clef.setAttribute('fill', 'currentColor');
  clef.setAttribute('stroke', 'none');
  clef.textContent = '𝄞';
  svg.append(clef);
  return svg;
}

// Return-to-score icon: five staff lines with noteheads and stems.
// The existing treble-clef icon for opening the key-signature editor stays untouched.
function scoreReturnStaffIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 32 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = (d, width = 1.25) => {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    p.setAttribute('stroke-width', String(width));
    svg.append(p);
  };
  path('M1 4.5H31 M1 8.25H31 M1 12H31 M1 15.75H31 M1 19.5H31', 0.9);
  const head = (cx, cy) => {
    const n = document.createElementNS(ns, 'ellipse');
    n.setAttribute('cx', String(cx));
    n.setAttribute('cy', String(cy));
    n.setAttribute('rx', '3.1');
    n.setAttribute('ry', '2.2');
    n.setAttribute('transform', 'rotate(-22 ' + cx + ' ' + cy + ')');
    n.setAttribute('fill', 'currentColor');
    n.setAttribute('stroke', 'none');
    svg.append(n);
  };
  head(11, 15.75);
  path('M14 15.75V4.5', 1.45);
  head(23, 12);
  path('M26 12V2.5', 1.45);
  return svg;
}

// Clear two-way editor switch affordance, paired with the existing clef/staff icon.
function studioFileIcon(type) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(ns, 'path');
  if (type === 'share') {
    path.setAttribute('d', 'M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5');
  } else {
    path.setAttribute('d', 'M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm8 0v5h5');
  }
  svg.append(path);
  if (type === 'pdf') {
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', '12');
    text.setAttribute('y', '17');
    text.setAttribute('font-size', '7');
    text.setAttribute('font-weight', '700');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('stroke', 'none');
    text.setAttribute('fill', 'currentColor');
    text.textContent = 'PDF';
    svg.append(text);
  }
  return svg;
}

function scoreToolIcon(mode) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const shape = document.createElementNS(ns, 'path');
  shape.setAttribute('d', {
    select: 'M4 3 19 12l-7 1-3 7L4 3Zm8 10 5 7',
    pen: 'm4 20 5-1 11-11a2.8 2.8 0 0 0-4-4L5 15l-1 5ZM14 6l4 4',
    eraser: 'M4 14 14 4a2.8 2.8 0 0 1 4 0l3 3a2.8 2.8 0 0 1 0 4l-9 9H9l-5-5a2 2 0 0 1 0-1ZM9 9l7 7M12 20h9',
    wrap: 'M3 5h18M3 10h18M3 15h11m4-3 3 3-3 3M21 15h-5a5 5 0 0 0-5 5'
  }[mode]);
  svg.append(shape);
  return svg;
}

// Browser-safe custom cursors; the hotspot is the tip of the pen/eraser.
function scoreEditingCursor(mode) {
  const shape = mode === 'pen'
    ? '<path d="M3 29 6 21 23 4Q26 1 29 4Q31 6 28 9L11 26Z" fill="white" stroke="#163949" stroke-width="2" stroke-linejoin="round"/><path d="m20 7 5 5M3 29l8-3" fill="none" stroke="#163949" stroke-width="2"/>'
    : '<path d="M4 19 18 5Q20 3 22 5l7 7q2 2 0 4L17 28h-6z" fill="white" stroke="#163949" stroke-width="2" stroke-linejoin="round"/><path d="m11 12 10 10" fill="none" stroke="#163949" stroke-width="2"/>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' + shape + '</svg>';
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' +
    (mode === 'pen' ? '3 29' : '7 23') + ', crosshair';
}

function scoreTransportIcon(type) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const rect = (x,y,width,height) => {
    const r = document.createElementNS(ns, 'rect');
    for (const [k,v] of Object.entries({x,y,width,height,rx:1})) r.setAttribute(k,v);
    svg.append(r);
  };
  if (type === 'play') {
    const path = document.createElementNS(ns,'path');
    path.setAttribute('d','M8 5 19 12 8 19Z');
    svg.append(path);
  } else if (type === 'pause') {
    rect(5,5,5,14);
    rect(14,5,5,14);
  } else if (type === 'record') {
    const circle = document.createElementNS(ns,'circle');
    circle.setAttribute('cx','12');
    circle.setAttribute('cy','12');
    circle.setAttribute('r','7');
    svg.append(circle);
  } else if (type === 'generate') {
    const sparkle = document.createElementNS(ns,'path');
    sparkle.setAttribute('d','M12 2 14.3 8.7 21 11l-6.7 2.3L12 20l-2.3-6.7L3 11l6.7-2.3L12 2ZM19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7Z');
    svg.append(sparkle);
  } else {
    rect(5,5,14,14);
  }
  return svg;
}

function updateScoreTransportButtons() {
  const playButton = $('[data-score-transport]');
  const pauseButton = $('[data-score-pause]');
  if (!playButton || !pauseButton) return;
  const isActive = Boolean(scoreTransport);
  const mainLabel = isActive
    ? t('Stop and return to start', 'توقف و بازگشت به ابتدای قطعه')
    : t('Play score', 'پخش قطعه');
  playButton.replaceChildren(scoreTransportIcon(isActive ? 'stop' : 'play'));
  playButton.title = mainLabel;
  playButton.setAttribute('aria-label', mainLabel);
  const pauseLabel = scoreTransport?.paused
    ? t('Resume playback', 'ادامه پخش')
    : t('Pause playback', 'مکث پخش');
  pauseButton.replaceChildren(scoreTransportIcon(scoreTransport?.paused ? 'play' : 'pause'));
  pauseButton.title = pauseLabel;
  pauseButton.setAttribute('aria-label', pauseLabel);
  pauseButton.disabled = !isActive;
}

function silenceScoreTransport(transport) {
  if (transport.timer !== null) clearTimeout(transport.timer);
  transport.timer = null;
  if (transport.output) {
    const output = transport.output;
    transport.output = null;
    const time = transport.clock.currentTime;
    output.gain.cancelScheduledValues(time);
    output.gain.setTargetAtTime(0, time, .006);
    setTimeout(() => output.disconnect(), 160);
  }
  for (const release of transport.releases.splice(0)) {
    try { release(0) } catch {}
  }
}

function stopScorePlayback() {
  if (!scoreTransport) return;
  const transport = scoreTransport;
  scoreTransport = null;
  silenceScoreTransport(transport);
  clearPlaybackMarker();
  updateScoreTransportButtons();
}

function scheduleScoreTransport(transport) {
  transport.output = createScoreOutput();
  transport.anchor = transport.clock.currentTime;
  for (const n of transport.notes) {
    const remaining = n.at + n.d - transport.offset;
    if (remaining <= 0) continue;
    const delay = Math.max(0, n.at - transport.offset);
    const duration = n.at < transport.offset ? remaining : n.d;
    const release = voice(n.hz, delay, transport.output);
    release(duration);
    transport.releases.push(release);
  }
  transport.timer = setTimeout(() => {
    if (scoreTransport === transport && !transport.paused) stopScorePlayback();
  }, Math.max(100, (transport.end - transport.offset) * 1000 + 220));
}

function startScorePlayback() {
  if (scoreTransport || !e.notes.length) return;
  const clock = unlock();
  const notes = e.notes.map((n,index) => ({
    index, at:n.at, d:Math.min(n.d,6), hz:freq(e,n.m)
  }));
  const end = Math.max(0, ...notes.map(n => n.at + n.d));
  const transport = {
    clock, notes, end, offset:0, anchor:0, paused:false,
    output:null, releases:[], timer:null
  };
  scoreTransport = transport;
  scheduleScoreTransport(transport);
  // Keep the existing score note-marker system without changing its functions.
  clearPlaybackMarker();
  playback = {
    clock, started:transport.anchor,
    notes:notes.map(n => ({index:n.index, at:n.at, d:n.d})),
    end, markerSignature:null, frame:null
  };
  paintPlaybackMarker(true);
  playback.frame = requestAnimationFrame(advancePlaybackMarker);
  updateScoreTransportButtons();
}

function pauseScorePlayback() {
  const transport = scoreTransport;
  if (!transport || transport.paused) return;
  transport.offset = Math.min(transport.end,
    transport.offset + Math.max(0, transport.clock.currentTime - transport.anchor));
  silenceScoreTransport(transport);
  transport.paused = true;
  if (playback) {
    cancelAnimationFrame(playback.frame);
    playback.clock = {currentTime:transport.offset};
    playback.started = 0;
    paintPlaybackMarker(true);
  }
  updateScoreTransportButtons();
}

function resumeScorePlayback() {
  const transport = scoreTransport;
  if (!transport || !transport.paused) return;
  if (transport.offset >= transport.end) {
    stopScorePlayback();
    return;
  }
  transport.paused = false;
  scheduleScoreTransport(transport);
  if (playback) {
    playback.clock = transport.clock;
    playback.started = transport.anchor - transport.offset;
    playback.markerSignature = null;
    paintPlaybackMarker(true);
    playback.frame = requestAnimationFrame(advancePlaybackMarker);
  }
  updateScoreTransportButtons();
}

function studio() {
  const heading = el('h2', app, e.title || t('Untitled etude', 'اتود بدون نام'), 'print-title');
  const top = row(app);top.classList.add('project-actions');
  const titleEdit = el('div', top, undefined, 'etude-title-edit');
  const title = el('input', titleEdit, undefined, 'etude-title-input');
  title.type = 'text';
  title.value = e.title;
  title.size = Math.max(12, Math.min(48, title.value.length + 2));
  title.placeholder = t('Untitled etude', 'اتود بدون نام');
  title.setAttribute('aria-label', t('Etude title', 'عنوان اتود'));
  title.oninput = () => {
    title.size = Math.max(12, Math.min(48, title.value.length + 2));
  };
  title.onchange = () => {
    e.title = title.value;
    heading.textContent = title.value;
    save();
  };
  const editTitleButton = btn(titleEdit, '', () => {
    title.focus();
    title.select();
  }, t('Edit etude title', 'ویرایش عنوان اتود'));
  editTitleButton.className = 'etude-title-edit-button';
  editTitleButton.setAttribute('aria-label', t('Edit etude title', 'ویرایش عنوان اتود'));
  editTitleButton.append(scoreToolIcon('pen'));
  const shareButton = btn(top, '', async () => {
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
  }, t('Share file', 'اشتراک فایل'));
  shareButton.className = 'studio-file-action';
  shareButton.setAttribute('aria-label', t('Share file', 'اشتراک فایل'));
  shareButton.append(studioFileIcon('share'));
  const pdfButton = btn(top, '', async () => {
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
  }, t('Export PDF', 'خروجی PDF'));
  pdfButton.className = 'studio-file-action';
  pdfButton.setAttribute('aria-label', t('Export PDF', 'خروجی PDF'));
  pdfButton.append(studioFileIcon('pdf'));
  const panel = el('section', app);

  function toggle() {
    stopKeys();
    if (rec) { save(); rec = null; }
    else {
      stopScorePlayback();
      unlock();
      rec = {
        start: unlock().currentTime,
        base: Math.max(0, ...e.notes.map(n => n.at + n.d))
      }
    }
    render()
  }
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
  // The Manual/AI choice lives beside the existing score. The notes stay
  // canonical on this etude; generated exercises only store practice settings.
  const composeHost = el('div', panel, undefined, 'studio-compose-host');
  const composerTarget = e, composerId = activeId;
  let practiceHost = null;
  const composer = mountEtudeComposer(composeHost, {
    etude: composerTarget, fa,
    isRecording: () => Boolean(rec),
    isCurrent: () => page === 'studio' && activeId === composerId && e === composerTarget,
    onModeChange: locked => {
      if (practiceHost) setStudioPracticeLocked(practiceHost, locked, fa);
    },
    onSignatureChange: signature => {
      if (page !== 'studio' || activeId !== composerId || e !== composerTarget) return;
      stopKeys();
      stopSignaturePreview();
      stopScorePlayback();
      applyMusicSignature(composerTarget, signature);
      save();
      sheet(); // Repaint the staff and key-signature editor from e.key.
      // Key down uses freq(e,m) live; refresh the tooltip's cached frequency too.
      for (const pianoKey of document.querySelectorAll('.board button[data-midi]')) {
        const midi = Number(pianoKey.dataset.midi);
        const shortcut = pianoKey.dataset.shortcut?.replace(/^Key/,'');
        pianoKey.title = (pianoKey.ariaLabel || label(midi)) + ' · ' +
          freq(composerTarget,midi).toFixed(1) + ' Hz' +
          (shortcut ? ' ('+shortcut+')' : '');
      }
    },
    onGenerated: next => {
      stopScorePlayback();
      Object.assign(composerTarget, next);
      practiceToExpand = next.practiceSequence?.[0]?.id ?? null;
      // Regeneration begins a completely new practice plan, including the
      // legacy Practice settings; no second copy of notes is maintained.
      composerTarget.rule = fresh().rule;
      scoreUndoStack.length = 0;
      sel.clear();
      save();
      render();
    }
  });
  const scoreHeading = el('div', panel, undefined, 'score-heading');
  const signatureAction = signatureMode
    ? t('Back to Score', 'بازگشت به خط حامل')
    : t('Edit Key Signature', 'ویرایش سرکلید');
  const keyButton = btn(scoreHeading, '', () => {
    stopSignaturePreview();
    if (!signatureMode) {
      stopScorePlayback();
      signaturePitch = SIGNATURE_PITCHES.find(p => e.key[p.pc])?.pc ?? 0;
      scoreTool = 'select';
    }
    signatureMode = !signatureMode;
    render();
  }, signatureAction);
  keyButton.className = 'score-tool-button signature-toggle';
  keyButton.dataset.signatureToggle = '';
  keyButton.setAttribute('aria-label', signatureAction);
  keyButton.setAttribute('aria-pressed', String(signatureMode));
  const signatureSymbol = signatureMode ? scoreReturnStaffIcon() : scoreSignatureIcon();
  signatureSymbol.classList.add('score-switch-symbol');
  keyButton.append(signatureSymbol);
  const switchLabel = el('span', keyButton, signatureAction, 'signature-toggle-label');
  switchLabel.dir = 'auto';
  el('h2',panel,signatureMode
    ? t('Key Signature Editor','تنظیم سرکلید')
    : t('Score','خط حامل'),'score-title');
  const scoreActions = row(panel);
  scoreActions.classList.add('score-actions');
  for (const [mode, en, ir] of [
    ['select', 'Select', 'انتخاب'],
    ['pen', 'Pen', 'قلم'],
    ['eraser', 'Eraser', 'پاک‌کن']
  ]) {
    const tool = btn(scoreActions, '', () => {
      if (scoreTool === mode && !signatureMode) return;
      stopSignaturePreview();
      signatureMode=false;
      scoreTool = mode;
      render();
    }, t(en, ir));
    tool.className = 'score-tool-button';
    tool.hidden = signatureMode;
    tool.dataset.scoreTool = mode;
    tool.setAttribute('aria-label', t(en, ir));
    tool.setAttribute('aria-pressed', String(!signatureMode && scoreTool === mode));
    if (!signatureMode && scoreTool === mode) tool.classList.add('active');
    tool.append(scoreToolIcon(mode));
  }
  const wrapButton = btn(scoreActions, '', () => {
    wrap = !wrap;
    render();
  }, t('Wrap staff', 'چندخطی'));
  wrapButton.className = 'score-wrap-button';
  wrapButton.hidden=signatureMode;
  wrapButton.classList.toggle('active', wrap);
  wrapButton.setAttribute('aria-label', t('Wrap staff', 'چندخطی'));
  wrapButton.setAttribute('aria-pressed', String(wrap));
  wrapButton.append(scoreToolIcon('wrap'));

  btn(scoreActions, '−', () => {
    zoom = Math.max(.4, zoom - .2);
    sheet();
  }, t('Zoom out', 'کوچک‌نمایی')).classList.add('score-zoom-button');
  btn(scoreActions, '+', () => {
    zoom = Math.min(3, zoom + .2);
    sheet();
  }, t('Zoom in', 'بزرگ‌نمایی')).classList.add('score-zoom-button');
  if(signatureMode)
    scoreActions.querySelectorAll('.score-zoom-button').forEach(button=>button.hidden=true);

  const transportActions = el('div', scoreActions, undefined, 'score-transport-actions');
  transportActions.hidden = signatureMode;
  const playButton = btn(transportActions, '', () => {
    if (scoreTransport) stopScorePlayback();
    else startScorePlayback();
  });
  playButton.dataset.scoreTransport = '';
  playButton.classList.add('score-transport-button');
  const pauseButton = btn(transportActions, '', () => {
    if (!scoreTransport) return;
    if (scoreTransport.paused) resumeScorePlayback();
    else pauseScorePlayback();
  });
  pauseButton.dataset.scorePause = '';
  pauseButton.classList.add('score-transport-button');
  updateScoreTransportButtons();
  const record = btn(transportActions, '', toggle,
    (rec ? t('Stop recording', 'توقف ضبط') : t('Start recording', 'شروع ضبط')) + ' (R)');
  record.dataset.record = '';
  record.className = (rec ? 'recording' : 'primary') + ' score-record';
  record.setAttribute('aria-label', rec ? t('Stop recording', 'توقف ضبط') : t('Start recording', 'شروع ضبط'));
  record.append(scoreTransportIcon(rec ? 'stop' : 'record'));
  el('div', panel, undefined, 'score');
  const signatureControls=el('div',panel,undefined,'signature-editor-controls');
  signatureControls.hidden=true;
  const scoreBelowActions = row(panel);
  scoreBelowActions.classList.add('score-below-actions');
  scoreBelowActions.hidden=signatureMode;

  // Tempo remains a global time-scale edit; only numeric input is shown.
  const tempoControl = el('div', scoreBelowActions, undefined, 'score-tempo');
  el('span', tempoControl, t('Tempo', 'سرعت'), 'score-tempo-label');
  const tempoNumber = el('input', tempoControl, undefined, 'score-tempo-number');
  tempoNumber.type = 'number';
  tempoNumber.min = '20';
  tempoNumber.max = '300';
  tempoNumber.step = '1';
  tempoNumber.value = String(e.bpm);
  tempoNumber.inputMode = 'numeric';
  tempoNumber.setAttribute('aria-label', t('Tempo in BPM', 'سرعت قطعه برحسب BPM'));
  el('span', tempoControl, 'BPM', 'score-tempo-unit');
  tempoNumber.onchange = () => {
    if (!tempoNumber.reportValidity() || !setEtudeTempo(Number(tempoNumber.value)))
      tempoNumber.value = String(e.bpm);
  };

  // Practice Sequence is authored here in Studio, not in the learner player.
  // The editor reads/writes the same e.practiceSequence used by AI and export.
  practiceHost=el('div',app,undefined,'studio-practice-host');
  const expanded = practiceToExpand ? [practiceToExpand] : [];
  practiceToExpand = null;
  renderStudioPractice(practiceHost,e,{fa,save,expanded,
    locked:composer.isPracticeLocked()});
  rules();
  sheet()
}

function detail(name) {
  const d = el('details', app);
  el('summary', d, name);
  return d
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
  stopSignaturePreview();
  stopScorePlayback();
  clearPlaybackMarker();
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

// Browser Back/Forward, Android WebView history and iOS WKWebView history
// update the same Goosh page state without full page reloads.
listenToRoutes(()=>{
  cancel();page=readRoute().page;loadRoute();render();window.scrollTo(0,0);
});

function openDeleteEtudeDialog(id,name){
  const dialog=el('dialog',document.body,undefined,'etude-delete-dialog');
  dialog.setAttribute('aria-labelledby','etude-delete-dialog-title');
  dialog.setAttribute('aria-describedby','etude-delete-dialog-description');
  const title=el('h2',dialog,t('Delete this etude?','این اتود حذف شود؟'));
  title.id='etude-delete-dialog-title';
  el('div',dialog,name,'etude-delete-name');
  const description=el('p',dialog,t(
    'This etude will be permanently removed from your collection. This action cannot be undone.',
    'این اتود برای همیشه از مجموعه شما حذف می‌شود و قابل بازگردانی نیست.'
  ));
  description.id='etude-delete-dialog-description';
  const actions=el('div',dialog,undefined,'etude-delete-actions');
  const cancelButton=btn(actions,t('Cancel','انصراف'),()=>dialog.close());
  cancelButton.className='etude-delete-cancel';
  const deleteButton=btn(actions,t('Delete etude','حذف اتود'),()=>{
    dialog.close();
    localStorage.removeItem(prefix+id);
    collection.delete(id);
    render();
  });
  deleteButton.className='etude-delete-confirm';
  dialog.onclose=()=>dialog.remove();
  dialog.showModal();
  cancelButton.focus();
}

function etudeList(){
  const actions=row(app);
  if(page==='studio')btn(actions,t('New etude','ساخت اتود'),()=>{
    navigateTo('studio',addEtude(fresh(),'own'));
  }).className='primary';
  btn(actions,t('Import etude','وارد کردن اتود'),()=>$('#file').click());
  const grid=el('div',app,undefined,'shelves');
  for(const [origin,title] of [['own',t('My etudes','اتودهای من')],['imported',t('Imported etudes','اتودهای واردشده')]]){
    const section=el('section',grid);
    el('h2',section,title);
    const entries=[...collection.entries()].filter(([,entry])=>entry.origin===origin);
    if(!entries.length)el('p',section,origin==='own'?t('No etudes created yet.','هنوز اتودی نساخته‌اید.'):t('No files imported yet.','هنوز فایلی وارد نکرده‌اید.'));
    for(const [id,entry] of entries.reverse()){
      const card=el('div',section,undefined,'etude-card');
      const item=el('button',card,undefined,'etude-item');
      const name=entry.data.title||t('Untitled etude','اتود بدون نام');
      el('strong',item,name);
      el('small',item,entry.data.notes.length.toLocaleString(fa?'fa':'en')+' '+t('notes','نت'));
      item.onclick=()=>navigateTo(page,id);
      const remove=btn(card,'',()=>openDeleteEtudeDialog(id,name),t('Delete etude','حذف اتود'));
      remove.className='etude-delete';
      remove.setAttribute('aria-label',t('Delete etude','حذف اتود')+' · '+name);
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
      icon.setAttribute('viewBox','0 0 24 24');
      icon.setAttribute('aria-hidden','true');
      icon.setAttribute('focusable','false');
      icon.setAttribute('fill','none');
      icon.setAttribute('stroke','currentColor');
      icon.setAttribute('stroke-width','1.8');
      icon.setAttribute('stroke-linecap','round');
      icon.setAttribute('stroke-linejoin','round');
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v6m4-6v6');
      icon.append(path);
      remove.append(icon);
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
  const navigate = (key,id=null) => navigateTo(key,id);
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
  if(page!=='home')el('h1',app,name);
  if(page==='home'){
    renderHome({
      el,app,t,collection,navigate,
      createEtude:()=>navigateTo('studio',addEtude(fresh(),'own')),
      importEtude:()=>$('#file').click()
    });
  }else if(!activeId){
    etudeList();
  }else{
    if (page === 'studio') studio();
    else {
      btn(row(app), t('Back to list', 'بازگشت به فهرست'), () => navigate(page));
      practice();
    }
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
    navigateTo(page==='practice'?'practice':'studio',id);
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
// Leaving the score surface exits Pen/Eraser without disturbing the clicked control.
document.addEventListener('pointerdown', ev => {
  if (page !== 'studio' || !activeId || signatureMode ||
      (scoreTool !== 'pen' && scoreTool !== 'eraser')) return;
  if (document.querySelector('dialog[open]')) return;
  if (ev.target.closest?.('.score, .score-actions [data-score-tool]')) return;
  scoreTool = 'select';
  document.querySelectorAll('#app[data-page="studio"] [data-score-tool]').forEach(button => {
    const isSelected = button.dataset.scoreTool === 'select';
    button.classList.toggle('active', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
  sheet();
});
document.onkeydown = ev => {
  if(document.querySelector('dialog[open]'))return;
  const typing = /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName) || ev.target.isContentEditable;
  if (page==='studio' && activeId && !rec && !typing && !ev.repeat &&
      ev.code==='KeyZ' && (ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey) {
    if (undoScoreEdit()) ev.preventDefault();
    return;
  }
  if (ev.repeat || ev.ctrlKey || ev.altKey || ev.metaKey || typing) return;
  const key = document.querySelector('[data-shortcut="' + ev.code + '"]');
  if (key) {
    ev.preventDefault();
    key.begin(ev.code, ev.timeStamp);
    return
  }
  if (page !== 'studio') return;
  if (ev.code === 'KeyR') $('[data-record]')?.click();
};
render()
installAndroidBackNavigation()

document.onkeyup = ev => held.get(ev.code)?.()
