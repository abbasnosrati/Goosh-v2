import {
  fresh,
  names,
  label,
  freq,
  valid,
  meterInfo,
  meterTimeline,
  METER_PRESETS,
  planScoreNoteReorder,
  planScoreRestEdit
} from './model.js?v=free-piano-overlap-drag-2'
import {
  unlock,
  voice,
  liveVoice,
  microphone,
  createScoreOutput,
  ready as pianoSamplesReady,
  PIANO_TAP_RING_SECONDS
} from './audio.js?v=score-piano-sample-articulation-1'
import {
  score,
  paintScorePlayhead
} from './score.js?v=select-cursor-arrow-1'
import {SIGNATURE_PITCHES,SIGNATURE_MARKS,drawKeySignatureEditor}
  from './key-signature.js?v=mobile-signature-modal-1'
import {isPersianAccidental, appendPersianAccidental}
  from './persian-accidentals.js?v=persian-marks-1'
import { mountEtudeComposer } from './studio-etude-generation.js?v=unified-guide-shell-1'
import { renderStudioPractice, setStudioPracticeLocked } from './studio-practice.js?v=music-toggle-reuse-1'
import { renderHome } from './home.js?v=studio-capabilities-feature-card-1';
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
  mobileSignatureDialog = null,
  zoom = 1,
  wrap = false,
  oct = 4,
  sel = new Set(),
  rangeSelectionActive = false,
  held = new Map(),
  session = null,
  playback = null,
  scoreTransport = null,
  scorePlaybackPending = false,
  scorePlaybackRequestId = 0,
  scoreUndoStack = [],
  practiceToExpand = null,
  penQuarterBeats = 1,
  freeTimelineOpen = false,
  scoreSeekPosition = 0,
  metronomeEnabled = false,
  recordingMetronome = null
const collection = new Map();
// Per-Etude UI preference; no note/audio model changes.
const studioPianoExpanded = new WeakMap();
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
  rangeSelectionActive=false;
  scoreTool='select';
  freeTimelineOpen=false;
  scoreSeekPosition=0;
  signatureMode=false;
  signaturePitch=0;
  scoreUndoStack.length=0;
  practiceToExpand=null;
  metronomeEnabled=false;
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

// A Western scale changes the written key signature, not the physical
// 12-key equal-tempered piano. Reuse freq() with no signature for Western;
// Iranian/legacy keyboards retain the full etude's tuning and offsets.
const naturalPianoTuning = {key:{},offset:{},marks:{}};
const pianoFrequency = midi => freq(
  e.musicContext?.musicSystem === 'western' ? naturalPianoTuning : e, midi
);
const pianoMarkNames = {'♭':'Flat','♯':'Sharp','کرن':'Koron','سری':'Sori'};
function updatePianoKey(key, shortcut) {
  const midi = Number(key.dataset.midi);
  const pc = midi % 12;
  const black = names[pc].includes('♯');
  const western = e.musicContext?.musicSystem === 'western';
  const mark = black || western ? '' : (e.key[pc] || '');
  const hasTuning = !western && !black && Boolean(mark || e.offset[pc]);
  const hz = pianoFrequency(midi).toFixed(2);
  const octave = String(Math.floor(midi / 12) - 1);
  key.replaceChildren();
  if (mark) {
    const note = el('span',key,undefined,'piano-key-note piano-key-altered');
    el('span',note,names[pc],'piano-key-letter');
    if (isPersianAccidental(mark)) {
      const glyph = appendPersianAccidental(note,mark,{width:11,height:17});
      glyph?.classList.add('piano-key-accidental');
    } else {
      el('span',note,mark,'piano-key-accidental');
    }
    el('span',note,octave,'piano-key-octave');
  } else {
    el('span',key,label(midi),'piano-key-note');
  }
  key.classList.toggle('piano-key-tuned',hasTuning);
  const spoken = mark
    ? names[pc]+' '+(fa ? mark : pianoMarkNames[mark] || mark)+' '+octave
    : label(midi);
  key.ariaLabel = spoken+' · '+hz+' Hz';
  key.title = key.ariaLabel+(shortcut?' ('+shortcut+')':'');
  delete key.dataset.shortcut;
  if(shortcut)key.dataset.shortcut='Key'+shortcut;
}
function refreshPianoKeyLabels() {
  for(const key of document.querySelectorAll('.board button[data-midi]')) {
    const shortcut=key.dataset.shortcut?.replace(/^Key/,'');
    updatePianoKey(key,shortcut);
  }
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
      updatePianoKey(key,shortcut);
    }
    viewport.scrollLeft=(12*(oct+1)-low)/12*7*box.clientWidth/whiteCount;

  }
  for(let m=low;m<=high;m++){
    const black=names[m%12].includes('♯'), b=el('button',box);
    b.dataset.midi=m;
    const shortcut=shortcuts[m-(oct+1)*12];
    updatePianoKey(b,shortcut);
    if (black) {
      b.className = 'black';
      b.style.left = ((white - .31) / whiteCount * 100) + '%'
    } else white++;
    const pressed = new Set();
    b.begin = (id, at, audioTime = unlock().currentTime) => {
      pressed.add(id);
      const recordDuration = onStart(m, audioTime);
      // A live piano's acoustic tail must never be saved as note length.
      // Finalize each physical key hold once, including same-pitch retriggers.
      let durationRecorded = false;
      const finishRecording = duration => {
        if (durationRecorded) return;
        durationRecorded = true;
        recordDuration?.(duration);
      };
      const off = liveVoice(pianoFrequency(m), finishRecording, audioTime);
      b.classList.add('down');
      held.set(id, () => {
        held.delete(id);
        pressed.delete(id);
        if (!pressed.size) b.classList.remove('down');
        const heldSeconds = Math.max(.001,
          Math.min(6, (performance.now() - at) / 1000));
        finishRecording(heldSeconds);
        // Preserve the existing piano sound envelope separately from
        // the physical key-held duration recorded in the etude.
        off(heldSeconds < .18 ? PIANO_TAP_RING_SECONDS : heldSeconds);

      })
    };
  }

  const octaveRail=el('div',viewport,undefined,'octave-rail');
  octaveRail.style.setProperty('--whites',whiteCount);
  for(let midi=low;midi<=high;midi+=12)el('span',octaveRail,'C'+(midi/12-1));
  // A subtle mobile-only cue for the horizontal keyboard scroll area.
  // It is purely decorative, leaving the original keys and scrolling intact.
  const scrollHint=el('div',p,undefined,'piano-scroll-hint');
  scrollHint.setAttribute('aria-hidden','true');
  el('span',scrollHint,'←','piano-scroll-hint-arrow');
  el('span',scrollHint,undefined,'piano-scroll-hint-track');
  el('span',scrollHint,'→','piano-scroll-hint-arrow');
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
  // Use the original octave jump when this piano is reopened after AI mode.
  p.recenterOctave = () => jump(oct);
}


// Notated beat duration differs from the pianist's physical key hold.
// Prefer nearby natural beat subdivisions while retaining the original
// 1/32-quarter grid as a fallback.
function snapRecordedOnset(time,quarter,grid) {
  const beat=time/quarter;
  for(const [division,tolerance] of [[1,.1],[2,.075],[4,.04]]){
    const target=Math.round(beat*division)/division;
    if(Math.abs(beat-target)<=tolerance)return target*quarter;
  }
  return Math.round(time/grid)*grid;
}

// Metered notation follows quantized key ATTACKS, never physical key holds.
// Each onset group lasts to the next attack, even across barlines; this
// deliberately does not infer a rest from an early key release or long gap.
// Only the final group needs a separate ending: the next beat by default,
// extended to the stopped beat when recording ends, but not beyond its bar.
function reconcileMeteredTake(take, stoppedAt = null) {
  if(!take.step||!take.events.length)return;
  const ordered=[...take.events].sort((a,b)=>a.note.at-b.note.at);
  const quarter=take.quarter,grid=take.step;
  const lastAt=ordered[ordered.length-1].note.at;
  const barEnd=(Math.floor((lastAt+1e-7)/take.barSeconds)+1)*take.barSeconds;
  const beatEnd=(Math.floor(lastAt/quarter+1e-7)+1)*quarter;
  const minimumEnd=Math.min(barEnd,beatEnd);
  const elapsed=stoppedAt===null||take.start===null
    ? 0:Math.max(0,stoppedAt-take.start);
  const stoppedBeat=stoppedAt===null
    ? minimumEnd:Math.ceil((take.base+elapsed)/quarter-1e-7)*quarter;
  let nextOnset=Math.max(lastAt+grid,
    Math.min(barEnd,Math.max(minimumEnd,stoppedBeat)));
  for(let i=ordered.length-1;i>=0;i--){
    const entry=ordered[i];
    if(i<ordered.length-1&&entry.note.at<ordered[i+1].note.at-1e-7)
      nextOnset=ordered[i+1].note.at;
    entry.note.d=Math.max(grid,Math.round((nextOnset-entry.note.at)/grid)*grid);
  }
}

function stopRecordingMetronome() {
  const state=recordingMetronome;
  if(!state)return;
  recordingMetronome=null;
  clearInterval(state.timer);
  const now=state.clock.currentTime;
  state.output.gain.cancelScheduledValues(now);
  state.output.gain.setValueAtTime(0,now);
  setTimeout(()=>state.output.disconnect(),150);
}

// The audio clock schedules each short click precisely. The JS interval
// only fills the lookahead window; no tick is saved in the musical score.
function startRecordingMetronome() {
  const meter=meterInfo(e);
  if(!rec||!metronomeEnabled||!meter||recordingMetronome)return;
  const clock=unlock(),output=createScoreOutput();
  output.gain.value=.6;
  // 6/8 and 6/16 use compound (dotted) beat pulses.
  const unitsPerPulse=meter.numerator===6?3:1;
  const interval=meter.quarterSeconds*4/meter.denominator*unitsPerPulse;
  const pulsesPerBar=meter.numerator/unitsPerPulse;
  const state={clock,output,timer:null,nextAt:clock.currentTime+.05,pulse:0};
  recordingMetronome=state;
  const fillQueue=()=>{
    while(recordingMetronome===state&&state.nextAt<clock.currentTime+.15){
      const at=state.nextAt,accent=state.pulse%pulsesPerBar===0;
      const oscillator=clock.createOscillator(),gain=clock.createGain();
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(accent?1200:850,at);
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.linearRampToValueAtTime(accent?.18:.11,at+.004);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.07);
      oscillator.connect(gain).connect(output);
      oscillator.start(at);
      oscillator.stop(at+.075);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
      state.pulse++;
      state.nextAt+=interval;
    }
  };
  fillQueue();
  state.timer=setInterval(fillQueue,25);
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

// The dashed Score ruler playhead is the only visual playback indicator.
// Keep it synced with the existing Web Audio clock; do not follow each note.
function paintPlaybackMarker() {
  if (!playback) return;
  const elapsed = playback.clock.currentTime - playback.started;
  paintScorePlayhead($('.studio-score-surface > .score'),elapsed);
}
function clearPlaybackMarker() {
  if (!playback) return;
  cancelAnimationFrame(playback.frame);
  playback = null;
  paintScorePlayhead($('.studio-score-surface > .score'),scoreSeekPosition);
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
    // Sequential Pen insertion shifts later onsets as one undoable edit.
    // Restore their exact original positions, including rests/chords.
    for(const {note,at} of action.shifted || [])
      if(e.notes.includes(note))note.at=at;
  } else if (action.kind==='erase') {
    const removed=action.items||[{note:action.note,index:action.index}];
    if(removed.some(({note})=>e.notes.includes(note))) {
      scoreUndoStack.pop();return false;
    }
    stopScorePlayback();
    // A marquee deletion is one undoable edit, including non-adjacent notes.
    for(const {note,index} of [...removed].sort((a,b)=>a.index-b.index))
      e.notes.splice(Math.min(index,e.notes.length),0,note);
  } else if (action.kind==='free-duration') {
    if(!e.notes.includes(action.note)) {scoreUndoStack.pop();return false;}
    stopScorePlayback();
    action.note.d=action.before;
  } else if (action.kind==='rest-edit') {
    stopScorePlayback();
    for(const {note,at} of action.shifted||[])
      if(e.notes.includes(note))note.at=at;
    e.measureCount=action.measureCount;
  } else if (action.kind==='move') {
    if (!e.notes.includes(action.note)) {scoreUndoStack.pop();return false;}
    stopScorePlayback();
    // Restore ALL reordered positions as one atomic Undo. No additional
    // notes/rests were ever created: silence is derived from these onsets.
    for(const {note,at} of action.shifted||[])
      if(e.notes.includes(note))note.at=at;
    // A change of staff line clears the per-note accidental; a purely
    // horizontal reorder keeps it. In either case Undo is exact.
    for(const property of ['m','at','staffM','staffAccidental','displayPitch']){
      if(Object.hasOwn(action.before,property))
        action.note[property]=action.before[property];
      else delete action.note[property];
    }
  } else return false;
  scoreUndoStack.pop();
  sel.clear();
  rangeSelectionActive=false;
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

function renderSignatureControls(box=$('.studio-score-surface > .signature-editor-controls'), inMobileDialog=false){
  if(!box)return
  box.hidden=!(signatureMode||inMobileDialog)
  box.replaceChildren()
  if(!signatureMode&&!inMobileDialog)return
  const selected=SIGNATURE_PITCHES.find(p=>p.pc===signaturePitch)
  if(!selected)return
  const pc=selected.pc,mark=e.key[pc]||''
  const base=e.marks[mark]||0
  const effective=base+(e.offset[pc]||0)
  el('strong',box,selected.name+' · '+t('Key signature','سرکلید'),
    'signature-editor-selected')
  const marks=el('div',box,undefined,'signature-editor-marks')
  for(const {mark:option,glyph,en,fa:ir} of SIGNATURE_MARKS){
    const button=btn(marks,'',()=>{
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
    // All five marks share one centered content box. Stored accidentals,
    // tuning, selection and SVG geometry remain unchanged.
    const symbol=el('span',button,undefined,'signature-mark-glyph')
    if(option===''){
      button.classList.add('signature-natural-mark')
      el('span',symbol,glyph,'signature-natural-symbol')
    }else if(isPersianAccidental(option)){
      button.classList.add('signature-microtonal')
      appendPersianAccidental(symbol,option,{width:18,height:22})
    }else{
      el('span',symbol,glyph,option==='♭'
        ? 'signature-western-symbol signature-flat-symbol'
        : 'signature-western-symbol signature-sharp-symbol')
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
    refreshPianoKeyLabels();
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

function measuredEditAllowed(notes) {
  if(!meterInfo(e))return true;
  const timeline=meterTimeline({...e,notes});
  // The teacher explicitly chose how many measures to prepare. A Pen or
  // retiming edit must not silently append a fifth bar to a four-bar score.
  return !timeline.issues.length &&
    timeline.bars.length <= (e.measureCount||4);
}
function meterMessage(en,ir) {
  const status=document.querySelector('#app[data-page="studio"] .score-meter-status');
  if(!status)return;
  status.textContent=t(en,ir);
  status.hidden=!status.textContent;
}
// Rests are derived from the existing note onsets; erasing/moving one
// must edit the surrounding note timings atomically, not add a second
// persistent score/audio timeline.
function editScoreRest(source, destination=null) {
  if(page!=='studio'||!activeId||signatureMode||rec||
     (destination&&scoreTool!=='select')||
     (!destination&&scoreTool!=='eraser'))return;
  const result=planScoreRestEdit(e,source,destination);
  if(!result.ok){
    const messages={
      'polyphony':[
        'A tied or overlapping passage cannot move this rest safely.',
        'جابجایی این سکوت در بخش چندصدایی یا نت‌های پیوندخورده امکان‌پذیر نیست.'
      ],
      'trailing-rest':[
        'Free mode cannot place a rest after the final note.',
        'در حالت آزاد، سکوت را نمی‌توان بعد از آخرین نت قرار داد.'
      ],
      'required-rest':[
        'This rest is required to complete the measure. Add a note to fill it.',
        'این سکوت برای کامل شدن میزان لازم است. برای پر کردن آن نت اضافه کنید.'
      ],
      'last-measure':[
        'At least one measure must remain.',
        'حداقل یک میزان باید باقی بماند.'
      ],
      'different-length':[
        'Rests can cross measures only with a matching-duration slot.',
        'انتقال سکوت بین میزان‌ها به جایگاهی با کشش یکسان نیاز دارد.'
      ]
    };
    const [en,ir]=messages[result.reason]||[
      'This rest cannot be changed at the selected position.',
      'این سکوت در جایگاه انتخاب‌شده قابل تغییر نیست.'
    ];
    meterMessage(en,ir);
    return;
  }
  if(!result.moves.length&&result.measureCount===e.measureCount)return;
  const shifted=result.moves.map(({index,at})=>({
    note:e.notes[index],at:e.notes[index].at,to:at
  }));
  const positions=new Map(shifted.map(change=>[change.note,change.to]));
  const candidate=e.notes.map(note=>({
    ...note,at:positions.get(note)??note.at
  }));
  const count=result.measureCount??e.measureCount;
  const timeline=meterTimeline({...e,measureCount:count,notes:candidate});
  if((meterInfo(e)&&(timeline.issues.length||timeline.bars.length>count))||
     candidate.some(note=>note.at<0||note.at+note.d>1e7)){
    meterMessage('This change would make the measure invalid.',
      'این تغییر باعث نامعتبر شدن میزان می‌شود.');
    return;
  }
  const oldCount=e.measureCount;
  stopScorePlayback();
  for(const change of shifted)change.note.at=change.to;
  e.measureCount=count;
  rememberScoreEdit({kind:'rest-edit',shifted,measureCount:oldCount});
  sel.clear();
  rangeSelectionActive=false;
  meterMessage('','');
  save();
  sheet();
}
// The phone modal reuses the desktop's drawing, mark buttons, cent controls
// and underlying e.key/e.offset. It never replaces the learner's Score.
function renderMobileSignatureDialog(){
  const dialog=mobileSignatureDialog;
  if(!dialog?.isConnected||!dialog.open)return;
  const staff=dialog.querySelector('.studio-mobile-signature-staff');
  const controls=dialog.querySelector('.signature-editor-controls');
  if(!staff||!controls)return;
  staff.dataset.view='signature';
  drawKeySignatureEditor(staff,e,{
    selectedPc:signaturePitch,compact:true,
    onSelect:pc=>{stopSignaturePreview();signaturePitch=pc;sheet()}
  });
  renderSignatureControls(controls,true);
}

// One eraser path for a single clicked note AND an entire marquee selection.
// Keep the canonical notes array (and Undo's identity reference) intact.
function eraseScoreNotes(indices) {
  if(page!=='studio'||!activeId||signatureMode||rec)return false;
  const selected=[...new Set(indices)].filter(i=>
    Number.isInteger(i)&&i>=0&&i<e.notes.length).sort((a,b)=>a-b);
  if(!selected.length)return false;
  const chosen=new Set(selected);
  const remaining=e.notes.filter((_,index)=>!chosen.has(index));
  if(!measuredEditAllowed(remaining)){
    meterMessage('This deletion would create an invalid measure.',
      'حذف این نت‌ها باعث نامعتبر شدن میزان می‌شود.');
    return false;
  }
  stopScorePlayback();
  const removed=selected.map(index=>({note:e.notes[index],index}));
  e.notes.splice(0,e.notes.length,...remaining);
  rememberScoreEdit({kind:'erase',items:removed});
  sel.clear();
  rangeSelectionActive=false;
  meterMessage('','');
  save();
  sheet();
  return true;
}

function sheet() {
  // The dialog has its own score-styled SVG host. Always paint notes on
  // the original Studio staff; do not accidentally replace the modal.
  const h = $('.studio-score-surface > .score');
  if (!h) return;
  refreshPianoKeyLabels();
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
    seek:seekScorePlayback,
    tool: scoreTool,
    fa,
    selected: sel,
    // Only a visual pointer into the existing note list; never persisted.
    recordingIndex: rec?.latestNote ? e.notes.indexOf(rec.latestNote) : -1,
    selectRange: rec ? undefined : indices => {
      stopScorePlayback();
      sel.clear();
      for(const index of indices)
        if(Number.isInteger(index)&&index>=0&&index<e.notes.length)sel.add(index);
      rangeSelectionActive=sel.size>0;
      scoreSeekPosition=sel.size?Math.min(...[...sel].map(i=>e.notes[i].at)):0;
      sheet();
    },
    moveRest: rec ? undefined : (source,slot) => editScoreRest(source,slot),
    eraseRest: rec ? undefined : source => editScoreRest(source),
    pick: (i, multi) => {
      if (rec) return;
      if (scoreTool === 'eraser') {
        eraseScoreNotes([i]);
        return;
      }
      if (scoreTool !== 'select') return;
      rangeSelectionActive=false;
      if (!multi) { sel.clear(); sel.add(i); sheet(); return; }
      if (sel.has(i)) sel.delete(i);
      else sel.add(i);
      sheet();
    },
    insert: (m, placement) => {
      if (scoreTool !== 'pen' || rec || !placement) return;
      // At the notehead's X we deliberately join its onset (a chord).
      // Everywhere else we insert BEFORE the following onset, shifting
      // all following notes/chords by the new quarter-note duration.
      const duration=60/e.bpm*penQuarterBeats;
      const chord=placement.kind==='chord';
      const at=placement.at;
      if(!Number.isFinite(at)||at<0||at>1e7) return;
      const shifted=chord||placement.kind==='after'||placement.kind==='rest'?[]:e.notes
        .filter(n=>n.at>=at-1e-7)
        .map(note=>({note,at:note.at}));
      if(shifted.some(({note})=>note.at+duration>1e7))return;
      const inserted={m,at,d:duration};
      if(placement.kind==='rest' && duration>placement.available+1e-7){
        meterMessage('This note is longer than the available rest. Choose a shorter value.',
          'کشش نت از سکوت موجود بیشتر است. کشش کوتاه‌تری انتخاب کنید.');
        return;
      }
      const candidate=e.notes.map(n=>({
        ...n,at:n.at+(shifted.some(entry=>entry.note===n)?duration:0)
      }));
      candidate.push(inserted);
      if(!measuredEditAllowed(candidate)){
        meterMessage('This note does not fit the selected measure count or rhythmic grid. Add a measure or choose a shorter note.',
          'این نت در تعداد میزان یا شبکهٔ ریتمی فعلی جا نمی‌گیرد. یک میزان اضافه کنید یا کشش کوتاه‌تری انتخاب کنید.');
        return;
      }
      stopScorePlayback();
      for(const {note} of shifted)note.at+=duration;
      meterMessage('','');
      e.notes.push(inserted);
      rememberScoreEdit({kind:'pen',note:inserted,shifted});
      sel.clear();
      rangeSelectionActive=false;
      save();
      sheet();
    },
    move: rec ? undefined : (index,target) => {
      if(scoreTool!=='select'||signatureMode||rec||
         !Number.isInteger(index)||index<0||index>=e.notes.length||!target)return;
      const note=e.notes[index],m=target.m;
      if(!Number.isInteger(m)||m<0||m>127||!target.slot)return;
      const written=Number.isInteger(note.staffM)?note.staffM:note.m;
      const pitchChanged=m!==written;
      const placement=planScoreNoteReorder(e,index,target.slot);
      if(!placement.ok){
        const full=placement.reason==='no-room';
        const complex=placement.reason==='polyphony';
        meterMessage(
          full
            ? 'Not enough rest space in the destination measure. Choose another slot.'
            : complex
              ? 'This overlapping or chord passage cannot be reordered safely.'
              : 'This destination cannot be represented with the current note lengths.',
          full
            ? 'در میزان مقصد سکوت کافی وجود ندارد. جایگاه دیگری انتخاب کنید.'
            : complex
              ? 'جابجایی افقی این آکورد یا نت‌های هم‌پوشان فعلاً ایمن نیست.'
              : 'این مقصد با کشش‌های فعلی نت‌ها قابل ثبت نیست.'
        );
        return;
      }
      // Small horizontal motion within the SAME note/rest slot is not a
      // timing edit. It must preserve every duration and explicit accidental.
      if(!pitchChanged&&!placement.moves.length)return;
      const shifted=placement.moves.map(({index:i,at})=>({
        note:e.notes[i],at:e.notes[i].at,to:at
      }));
      const atByNote=new Map(shifted.map(x=>[x.note,x.to]));
      const candidate=e.notes.map(entry=>{
        const at=atByNote.get(entry)??entry.at;
        if(entry!==note)return {...entry,at};
        const moved={...entry,at};
        if(pitchChanged){
          moved.m=m;
          delete moved.staffM;
          delete moved.staffAccidental;
          delete moved.displayPitch;
        }
        return moved;
      });
      if(!measuredEditAllowed(candidate)){
        meterMessage(
          'This move does not fit the current meter or prepared measures.',
          'این جابه‌جایی با میزان‌نما یا تعداد میزان‌های فعلی سازگار نیست.'
        );
        return;
      }
      const before={};
      for(const property of ['m','at','staffM','staffAccidental','displayPitch'])
        if(Object.hasOwn(note,property))before[property]=note[property];
      stopScorePlayback();
      for(const change of shifted)change.note.at=change.to;
      if(pitchChanged){
        note.m=m;
        // Only an actual vertical change resets a per-note accidental.
        // A horizontal reorder keeps explicit Koron/Sori/Flat/Sharp.
        delete note.staffM;
        delete note.staffAccidental;
        delete note.displayPitch;
      }
      rememberScoreEdit({kind:'move',note,before,shifted});
      sel.clear();
      rangeSelectionActive=false;
      sel.add(index);
      meterMessage('','');
      save();
      sheet();
    }
  });
  if(playback)paintPlaybackMarker(true);
  else paintScorePlayhead(h,scoreSeekPosition);
  renderFreeTimeline($('.studio-score-surface > .score-free-timeline'));
  renderSignatureControls();
  renderMobileSignatureDialog();
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

// Free meter alone permits arbitrary durations without moving later onsets.
// The same e.notes, score renderer, audio transport and Undo stack are reused.
function setFreeNoteDuration(note,seconds) {
  if(page!=='studio'||!activeId||rec||signatureMode||meterInfo(e)||
     !e.notes.includes(note)||!Number.isFinite(seconds)||
     seconds<.001||seconds>1e5||note.at+seconds>1e7)return false;
  if(Math.abs(note.d-seconds)<.0005)return true;
  stopScorePlayback();
  rememberScoreEdit({kind:'free-duration',note,before:note.d});
  note.d=seconds;
  scoreSeekPosition=0;
  sel.clear();
  rangeSelectionActive=false;
  save();
  sheet();
  return true;
}

function renderFreeTimeline(host) {
  if(!host)return;
  const visible=freeTimelineOpen&&!meterInfo(e)&&!signatureMode;
  host.hidden=!visible;
  if(!visible){host.replaceChildren();return;}
  const priorScroll=host.querySelector('.free-timeline-scroll')?.scrollLeft||0;
  host.replaceChildren();
  const header=el('div',host,undefined,'free-timeline-heading');
  el('strong',header,t('Free timing editor','ویرایش کشش آزاد'));
  el('small',header,t(
    'Drag a note’s right edge to resize it. Other note onsets stay fixed.',
    'لبهٔ راست هر نت را بکشید تا کشش آن تغییر کند؛ شروع بقیهٔ نت‌ها ثابت می‌ماند.'
  ));
  if(!e.notes.length){
    el('p',host,t('Add or record a note to edit its timing.',
      'برای ویرایش کشش، ابتدا نتی بنویسید یا ضبط کنید.'),'free-timeline-empty');
    return;
  }
  const sorted=e.notes.map((note,index)=>({note,index})).sort((a,b)=>
    a.note.at-b.note.at||a.index-b.index);
  const end=Math.max(1,...sorted.map(({note})=>note.at+note.d));
  const scale=Math.min(112,Math.max(.05,120000/Math.max(1,end)));
  const width=Math.max(750,Math.ceil(end*scale+64));
  const startX=22;
  const occupied=[];
  const positioned=sorted.map(entry=>{
    const visualEnd=entry.note.at+Math.max(entry.note.d,18/scale)+.04;
    let lane=occupied.findIndex(value=>value<=entry.note.at);
    if(lane<0){lane=occupied.length;occupied.push(0);}
    occupied[lane]=visualEnd;
    return {...entry,lane};
  });
  const height=38+occupied.length*42+12;
  const viewport=el('div',host,undefined,'free-timeline-scroll');
  viewport.tabIndex=0;
  viewport.setAttribute('aria-label',t('Free note timeline','تایم‌لاین نت‌های آزاد'));
  const track=el('div',viewport,undefined,'free-timeline-track');
  track.style.width=width+'px';
  track.style.height=height+'px';
  const every=Math.max(1,Math.ceil(end/80));
  for(let sec=0;sec<=end;sec+=every){
    const tick=el('div',track,undefined,'free-timeline-tick');
    tick.style.left=(startX+sec*scale)+'px';
    el('span',tick,sec+'s');
  }
  const durationLabel=seconds=>seconds.toFixed(2).replace(/\.?0+$/,'')+'s';
  for(const {note,index,lane} of positioned){
    const clip=el('div',track,undefined,'free-timeline-note');
    const left=startX+note.at*scale;
    clip.style.left=left+'px';
    clip.style.top=(35+lane*42)+'px';
    clip.style.width=Math.max(18,note.d*scale)+'px';
    clip.title=(note.displayPitch||label(note.m))+' · '+durationLabel(note.d);
    const name=el('span',clip,note.displayPitch||label(note.m),'free-timeline-note-name');
    const length=el('span',clip,durationLabel(note.d),'free-timeline-note-duration');
    clip.setAttribute('aria-label',clip.title);
    clip.onclick=()=>{
      if(rec)return;
      sel.clear();sel.add(index);rangeSelectionActive=false;sheet();
    };
    const handle=el('button',clip,'','free-timeline-resize');
    handle.type='button';
    handle.setAttribute('aria-label',t('Resize note','تغییر کشش نت')+' '+(note.displayPitch||label(note.m)));
    handle.title=t('Drag to resize','برای تغییر کشش بکشید');
    let drag=null;
    handle.onpointerdown=ev=>{
      if(ev.button!==undefined&&ev.button!==0||rec)return;
      ev.preventDefault();
      ev.stopPropagation();
      drag={id:ev.pointerId,x:ev.clientX,d:note.d};
      handle.setPointerCapture?.(ev.pointerId);
    };
    const resized=ev=>Math.max(.01,Math.min(1e5,
      Math.round((drag.d+(ev.clientX-drag.x)/scale)*100)/100));
    handle.onpointermove=ev=>{
      if(!drag||drag.id!==ev.pointerId)return;
      const duration=resized(ev);
      clip.style.width=Math.max(18,duration*scale)+'px';
      length.textContent=durationLabel(duration);
      ev.preventDefault();
    };
    handle.onpointerup=ev=>{
      if(!drag||drag.id!==ev.pointerId)return;
      const duration=resized(ev);
      drag=null;
      if(handle.hasPointerCapture?.(ev.pointerId))handle.releasePointerCapture(ev.pointerId);
      ev.stopPropagation();
      if(!setFreeNoteDuration(note,duration)){
        clip.style.width=Math.max(18,note.d*scale)+'px';
        length.textContent=durationLabel(note.d);
      }
    };
    handle.onclick=ev=>ev.stopPropagation();
    handle.onpointercancel=()=>{drag=null;clip.style.width=Math.max(18,note.d*scale)+'px';length.textContent=durationLabel(note.d)};
    handle.onkeydown=ev=>{
      if(!['ArrowLeft','ArrowRight'].includes(ev.key)||rec)return;
      ev.preventDefault();
      setFreeNoteDuration(note,Math.max(.01,
        Math.round((note.d+(ev.key==='ArrowRight'?.1:-.1))*100)/100));
    };
  }
  viewport.scrollLeft=priorScroll;
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
    range: 'M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4M10 4h4M20 10v4M14 20h-4M4 14v-4',
    timeline: 'M3 5v14m0-7h18M7 8h8v8H7zM15 8v8m4-5v5M1 19h22',
    wrap: 'M3 5h18M3 10h18M3 15h11m4-3 3 3-3 3M21 15h-5a5 5 0 0 0-5 5'
  }[mode]);
  svg.append(shape);
  return svg;
}

// Browser-safe custom cursors; the hotspot is the tip of the pen/eraser.
function scoreEditingCursor(mode) {
  const shape = mode === 'pen'
    ? '<path d="M3 29 6 21 23 4Q26 1 29 4Q31 6 28 9L11 26Z" fill="#F7FAFC" stroke="#102637" stroke-width="2" stroke-linejoin="round"/><path d="m20 7 5 5M3 29l8-3" fill="none" stroke="#102637" stroke-width="2"/>'
    : '<path d="M4 19 18 5Q20 3 22 5l7 7q2 2 0 4L17 28h-6z" fill="#F7FAFC" stroke="#102637" stroke-width="2" stroke-linejoin="round"/><path d="m11 12 10 10" fill="none" stroke="#102637" stroke-width="2"/>';
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
  } else if (type === 'metronome') {
    const path = document.createElementNS(ns,'path');
    path.setAttribute('d','M12 3 19 20H5L12 3Zm0 4v9m-3-4 6-3');
    path.setAttribute('fill','none');
    path.setAttribute('stroke','currentColor');
    path.setAttribute('stroke-width','1.9');
    path.setAttribute('stroke-linejoin','round');
    path.setAttribute('stroke-linecap','round');
    svg.append(path);
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
  const isActive = Boolean(scoreTransport || scorePlaybackPending);
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
  pauseButton.disabled = !scoreTransport;
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
  // Cancel a Play request while the piano samples are still loading.
  ++scorePlaybackRequestId;
  scorePlaybackPending = false;
  if (!scoreTransport) {
    updateScoreTransportButtons();
    return;
  }
  const transport = scoreTransport;
  scoreTransport = null;
  silenceScoreTransport(transport);
  clearPlaybackMarker();
  updateScoreTransportButtons();
}

function scheduleScoreTransport(transport) {
  transport.output = createScoreOutput();
  transport.anchor = transport.clock.currentTime;
  const repeatGates = new Map();
  let audibleEnd = transport.end;
  // Pencil insertion can append notes to e.notes out of chronological
  // order. Sort ONLY the scheduling view so same-key restrikes damp in
  // actual playback order without changing the saved score or note IDs.
  for (const n of [...transport.notes].sort((a,b) => a.at-b.at || a.index-b.index)) {
    const remaining = n.at + n.d - transport.offset;
    if (remaining <= 0) continue;
    const delay = Math.max(0, n.at - transport.offset);
    const duration = n.at < transport.offset ? remaining : n.d;
    // The app's piano key uses the SAME voice/sample, but a brief tap
    // releases after two seconds instead of cutting at a short note end.
    // Written lengths still determine exact attack times and score markers.
    const ring = Math.min(6, Math.max(PIANO_TAP_RING_SECONDS, duration));
    const startAt = transport.anchor + delay;
    // Re-striking the same key damps the old piano string (as liveVoice
    // does), without muting other notes of a chord or neighboring pitches.
    repeatGates.get(n.hz)?.gain.setTargetAtTime(0, startAt, .012);
    const gate = transport.clock.createGain();
    gate.connect(transport.output);
    const release = voice(n.hz, delay, gate, () => gate.disconnect());
    release(ring);
    transport.releases.push(release);
    repeatGates.set(n.hz, gate);
    audibleEnd = Math.max(audibleEnd, transport.offset + delay + ring + .18);
  }
  // Don't disconnect the instrument bus at the final notated note-off:
  // its natural piano decay must finish like an individual key tap.
  transport.timer = setTimeout(() => {
    if (scoreTransport === transport && !transport.paused) stopScorePlayback();
  }, Math.max(100, (audibleEnd - transport.offset) * 1000 + 80));
}

async function startScorePlayback() {
  if (scoreTransport || scorePlaybackPending || !e.notes.length) return;
  // A click on a piano key after loading uses the decoded MP3 samples;
  // don't play an Etude through the oscillator fallback while the same
  // samples are still loading in the background.
  const clock = unlock();
  const requestedEtude = e;
  // Snapshot the same selected note indices used by marquee/eraser.
  // All playback below still uses the ONE existing score transport.
  const selectedIndices=rangeSelectionActive&&sel.size?new Set(sel):null;
  const requestId = ++scorePlaybackRequestId;
  scorePlaybackPending = true;
  updateScoreTransportButtons();
  const sampleResults = await pianoSamplesReady;
  if (requestId !== scorePlaybackRequestId) return;
  scorePlaybackPending = false;
  if (e !== requestedEtude || page !== 'studio') {
    updateScoreTransportButtons();
    return;
  }
  // Never silently substitute the bright oscillator fallback for the
  // studio's acoustic piano while a sample request failed.
  if (sampleResults.some(result => result.status === 'rejected')) {
    const status = $('[data-score-audio-status]');
    if (status) {
      status.textContent = t(
        'Piano samples could not be loaded. Reload the page to retry.',
        'نمونه‌صداهای پیانو بارگیری نشدند. برای تلاش دوباره صفحه را بازخوانی کنید.'
      );
      status.hidden = false;
    }
    updateScoreTransportButtons();
    return;
  }
  const status = $('[data-score-audio-status]');
  if (status) { status.textContent = ''; status.hidden = true; }
  const notes = e.notes.flatMap((n,index) =>
    selectedIndices&&!selectedIndices.has(index)?[]:[{
      index, at:n.at, d:Math.min(n.d,6), hz:freq(e,n.m)
    }]);
  if(!notes.length){updateScoreTransportButtons();return;}
  const end = Math.max(0, ...notes.map(n => n.at + n.d));
  // Start at the first selected onset; preserve absolute score timestamps
  // so the existing pause/resume scheduler and note markers stay aligned.
  const selectionStart=selectedIndices?Math.min(...notes.map(n=>n.at)):0;
  const requested=Number.isFinite(scoreSeekPosition)?scoreSeekPosition:0;
  const start=selectedIndices
    ?(requested>=selectionStart && requested<end?requested:selectionStart)
    :Math.max(0,Math.min(requested,Math.max(0,end-.001)));
  scoreSeekPosition=start;
  const transport = {
    clock, notes, end, offset:start, anchor:0, paused:false,
    output:null, releases:[], timer:null
  };
  scoreTransport = transport;
  scheduleScoreTransport(transport);
  // Keep the existing score note-marker system without changing its functions.
  clearPlaybackMarker();
  playback = {
    clock, started:transport.anchor - transport.offset,
    end, frame:null
  };
  paintPlaybackMarker(true);
  playback.frame = requestAnimationFrame(advancePlaybackMarker);
  updateScoreTransportButtons();
}

// Seek changes only the starting offset of the existing Score transport.
// During active playback it restarts the same sampler/scheduler at that point.
function seekScorePlayback(seconds) {
  if(page!=='studio'||!activeId||signatureMode||rec||!Number.isFinite(seconds))return;
  const end=Math.max(0,...e.notes.map(n=>n.at+n.d));
  scoreSeekPosition=Math.max(0,Math.min(end,seconds));
  const wasPlaying=scorePlaybackPending||Boolean(scoreTransport&&!scoreTransport.paused);
  stopScorePlayback();
  paintScorePlayhead($('.studio-score-surface > .score'),scoreSeekPosition);
  if(wasPlaying)startScorePlayback();
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
      } finally {
        // Printing may temporarily wrap the staff; restore the user's view.
        wrap = prev;
        sheet();
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
  // Etude Setup is its own stage, above the separate Piano / Score section.
  // Keep the same composer instance and all original handlers intact.
  const composeHost = el('div', app, undefined, 'studio-compose-host');
  const panel = el('section', app);

  function toggle() {
    stopKeys();
    if (rec) {
      const stoppedAt=rec.start===null?null:unlock().currentTime;
      stopRecordingMetronome();
      reconcileMeteredTake(rec,stoppedAt);
      const completed=meterInfo(e)?meterTimeline(e):null;
      if(completed&&!completed.issues.length)
        e.measureCount=Math.max(e.measureCount||1,completed.bars.length);
      save();
      rec = null;
    }
    else {
      stopScorePlayback();
      sel.clear();
      rangeSelectionActive=false;
      unlock();
      const meter=meterInfo(e);
      rec = {
        start: null, // Anchor the take to the first played key, not Record.
        base: Math.max(0, ...e.notes.map(n => n.at + n.d)),
        step:meter?meter.quarterSeconds/8:0,
        quarter:meter?.quarterSeconds||0,
        barSeconds:meter?meter.barQuarterBeats*meter.quarterSeconds:0,
        events:[]
      };
      startRecordingMetronome();
    }
    render()
  }
  piano(panel, (m, at) => {
    if (!rec) return;
    // Record-arm time is not musical time: first key-on defines zero.
    if (rec.start === null) rec.start = at;
    const rawAt=rec.base+Math.max(0,at-rec.start);
    // Metered piano recording uses an explicit rhythmic 1/32-note grid;
    // free mode retains every original, unquantized performance timestamp.
    const snap=value=>rec.step
      ?snapRecordedOnset(value,rec.quarter,rec.step):value;
    const n = {
      m,
      at: snap(rawAt),
      d: rec.step||.001
    };
    const take = rec;
    e.notes.push(n);
    // Follow the latest piano attack in Free and Metered recording alike.
    take.latestNote=n;
    if(take.step){
      take.events.push({note:n});
      reconcileMeteredTake(take);
    }
    refreshTake(take);
    return d => {
      if (rec !== take||take.step) return;
      // Free recording alone preserves the actual physical key-hold duration.
      n.d=d;
      refreshTake(take);
    }
  });
  // Preserve the original piano and recording handlers; only its visibility
  // is controlled by Manual/AI and the user's own expand/collapse button.
  const studioPiano = panel.querySelector(':scope > .instrument');
  const pianoTools = studioPiano.querySelector(':scope > .row');
  const pianoKeys = studioPiano.querySelector(':scope > .keys');
  const pianoOctaveLabel = pianoTools.querySelector('label');
  const pianoToggle = btn(pianoTools, '', () => setPianoExpanded(pianoKeys.hidden),
    t('Show or hide piano', 'نمایش یا جمع‌کردن پیانو'));
  pianoToggle.type = 'button';
  pianoToggle.className = 'studio-piano-toggle';
  const setPianoExpanded = expanded => {
    const open = Boolean(expanded);
    const wasHidden = pianoKeys.hidden;
    pianoKeys.hidden = !open;
    if(pianoOctaveLabel)pianoOctaveLabel.hidden = !open;
    studioPiano.classList.toggle('studio-piano-collapsed', !open);
    pianoToggle.textContent = open ? t('Hide piano','جمع‌کردن پیانو') : t('Show piano','نمایش پیانو');
    pianoToggle.setAttribute('aria-expanded',String(open));
    pianoToggle.setAttribute('aria-label',pianoToggle.textContent);
    studioPianoExpanded.set(e,open);
    if(open && wasHidden)
      requestAnimationFrame(() => {if(!pianoKeys.hidden)studioPiano.recenterOctave?.()});
  };
  // Single Set Key Signature dialog for every viewport.
  const showSignatureEditor = () => {
    stopSignaturePreview();
    if(mobileSignatureDialog?.open)return;
      stopScorePlayback();
      signaturePitch = SIGNATURE_PITCHES.find(p=>e.key[p.pc])?.pc ?? 0;
      // This modal floats above the unchanged Score on every device.
      const dialog=el('dialog',app,undefined,'studio-mobile-signature-dialog');
      const card=el('div',dialog,undefined,'studio-mobile-signature-card');
      const header=el('div',card,undefined,'studio-mobile-signature-header');
      const title=el('div',header,undefined,'studio-mobile-signature-title');
      el('span',title,'𝄞','studio-mobile-signature-clef').setAttribute('aria-hidden','true');
      const heading=el('strong',title,t('Key Signature','سرکلید'));
      heading.id='studio-mobile-signature-title';
      dialog.setAttribute('aria-labelledby',heading.id);
      const close=btn(header,'',()=>dialog.close(),t('Close key signature','بستن سرکلید'));
      close.className='studio-mobile-signature-close';
      close.setAttribute('aria-label',t('Close key signature','بستن سرکلید'));
      const cross=document.createElementNS('http://www.w3.org/2000/svg','svg');
      cross.setAttribute('viewBox','0 0 24 24');
      cross.setAttribute('aria-hidden','true');
      const crossPath=document.createElementNS('http://www.w3.org/2000/svg','path');
      crossPath.setAttribute('d','M18 6 6 18 M6 6l12 12');
      cross.append(crossPath);
      close.append(cross);
      const editor=el('div',card,undefined,'studio-mobile-signature-editor');
      el('div',editor,undefined,'signature-editor-controls');
      el('div',editor,undefined,'score studio-mobile-signature-staff');
      dialog.addEventListener('click',event=>{
        if(event.target!==dialog)return;
        const bounds=dialog.getBoundingClientRect();
        if(event.clientX<bounds.left||event.clientX>bounds.right||
           event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
      });
      dialog.addEventListener('close',()=>{
        stopSignaturePreview();
        if(mobileSignatureDialog===dialog)mobileSignatureDialog=null;
        dialog.remove();
      },{once:true});
      mobileSignatureDialog=dialog;
      dialog.showModal();
      renderMobileSignatureDialog();
  };
  const composerTarget = e, composerId = activeId;
  let practiceHost = null;
  let meterSelect = null;
  const composer = mountEtudeComposer(composeHost, {
    etude: composerTarget, fa,
    signatureIcon: scoreSignatureIcon,
    onToggleKeySignature: showSignatureEditor,
    isRecording: () => Boolean(rec),
    isCurrent: () => page === 'studio' && activeId === composerId && e === composerTarget,
    onModeChange: (locked, needsMeterChoice, mode) => {
      if (practiceHost) setStudioPracticeLocked(practiceHost, locked, fa);
      if (meterSelect) meterSelect.value = needsMeterChoice ? '' : (e.meter || 'none');
      setPianoExpanded(mode !== 'ai');
    },
    onMeterSelect: selected => {
      if (!meterSelect || meterSelect.disabled) return;
      // Route the mobile mirror through Score's existing validation and save.
      meterSelect.value = selected;
      meterSelect.dispatchEvent(new Event('change', {bubbles:true}));
    },
    onSignatureChange: (signature, musicContext) => {
      if (page !== 'studio' || activeId !== composerId || e !== composerTarget) return;
      stopKeys();
      stopSignaturePreview();
      stopScorePlayback();
      applyMusicSignature(composerTarget, signature);
      composerTarget.musicContext = {...musicContext};
      save();
      sheet(); // Repaint staff, signature editor and piano key symbols/Hz from e.key.
    },
    onGenerated: next => {
      stopScorePlayback();
      Object.assign(composerTarget, next);
      practiceToExpand = next.practiceSequence?.[0]?.id ?? null;
      // Regeneration begins a new practice plan; keep legacy rule values
      // for backward-compatible Practice playback without exposing its old UI.
      composerTarget.rule = fresh().rule;
      scoreUndoStack.length = 0;
      sel.clear();
      rangeSelectionActive=false;
      save();
      render();
    }
  });
  setPianoExpanded(studioPianoExpanded.has(e)
    ? studioPianoExpanded.get(e) : composer.currentMode() !== 'ai');
  // Presentation wrapper: groups the existing Score, controls, meter and
  // tempo as one mobile section without altering any musical behavior.
  const scoreSurface = el('div', panel, undefined, 'studio-score-surface');
  // The Score itself needs no redundant caption below the piano.
  // Preserve the signature editor's contextual title only in that mode.
  if(signatureMode){
    const scoreHeading=el('div',scoreSurface,undefined,'score-heading');
    scoreHeading.tabIndex=-1;
    el('h2',scoreHeading,t('Key Signature Editor','تنظیم سرکلید'),'score-title');
  }
  const scoreActions = row(scoreSurface);
  scoreActions.classList.add('score-actions');
  for (const [mode, en, ir] of [
    ['select', 'Select', 'انتخاب'],
    ['pen', 'Pen', 'قلم'],
    ['eraser', 'Eraser', 'پاک‌کن'],
    ['range', 'Select area', 'انتخاب ناحیه']
  ]) {
    const tool = btn(scoreActions, '', () => {
      // Eraser removes a marked area in one operation; otherwise it stays
      // the original click-to-erase tool for individual notes.
      if(mode==='eraser'&&rangeSelectionActive&&sel.size){
        eraseScoreNotes([...sel]);
        return;
      }
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
  const audioStatus = el('p', transportActions, undefined, 'score-audio-status');
  audioStatus.dataset.scoreAudioStatus = '';
  audioStatus.setAttribute('role', 'status');
  audioStatus.hidden = true;
  const playButton = btn(transportActions, '', () => {
    if (scoreTransport || scorePlaybackPending) {
      stopScorePlayback();
      scoreSeekPosition=0;
      paintScorePlayhead($('.studio-score-surface > .score'),0);
    } else startScorePlayback();
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
  const metronomeButton=btn(transportActions,'',()=>{
    metronomeEnabled=!metronomeEnabled;
    if(metronomeEnabled)startRecordingMetronome();
    else stopRecordingMetronome();
    metronomeButton.classList.toggle('active',metronomeEnabled);
    metronomeButton.setAttribute('aria-pressed',String(metronomeEnabled));
    metronomeButton.title=t(
      metronomeEnabled?'Metronome on (clicks while recording)':'Metronome off',
      metronomeEnabled?'مترونوم روشن (هنگام ضبط)':'مترونوم خاموش');
    metronomeButton.setAttribute('aria-label',metronomeButton.title);
  });
  metronomeButton.className='score-metronome';
  metronomeButton.hidden=!meterInfo(e);
  metronomeButton.classList.toggle('active',metronomeEnabled);
  metronomeButton.setAttribute('aria-pressed',String(metronomeEnabled));
  metronomeButton.title=t(
    metronomeEnabled?'Metronome on (clicks while recording)':'Metronome off',
    metronomeEnabled?'مترونوم روشن (هنگام ضبط)':'مترونوم خاموش');
  metronomeButton.setAttribute('aria-label',metronomeButton.title);
  metronomeButton.append(scoreTransportIcon('metronome'));
  const record = btn(transportActions, '', toggle,
    (rec ? t('Stop recording', 'توقف ضبط') : t('Start recording', 'شروع ضبط')) + ' (R)');
  record.dataset.record = '';
  record.className = (rec ? 'recording' : 'primary') + ' score-record';
  record.setAttribute('aria-label', rec ? t('Stop recording', 'توقف ضبط') : t('Start recording', 'شروع ضبط'));
  record.append(scoreTransportIcon(rec ? 'stop' : 'record'));
  el('div', scoreSurface, undefined, 'score');
  el('div',scoreSurface,undefined,'score-free-timeline');
  const signatureControls=el('div',scoreSurface,undefined,'signature-editor-controls');
  signatureControls.hidden=true;
  const scoreBelowActions = row(scoreSurface);
  scoreBelowActions.classList.add('score-below-actions');
  scoreBelowActions.hidden=signatureMode;

  // Tempo is the leftmost control; the meter picker sits directly beside it.
  const timeControls=el('div',scoreBelowActions,undefined,'score-time-controls');
  // Tempo remains a global time-scale edit; only numeric input is shown.
  const tempoControl = el('div', timeControls, undefined, 'score-tempo');
  el('span', tempoControl, t('Tempo', 'سرعت'), 'score-tempo-label');
  const tempoNumber = el('input', tempoControl, undefined, 'score-tempo-number');
  tempoNumber.type = 'number';
  tempoNumber.min = '20';
  tempoNumber.max = '300';
  tempoNumber.step = '1';
  tempoNumber.value = String(e.bpm);
  tempoNumber.disabled=Boolean(rec);
  tempoNumber.inputMode = 'numeric';
  tempoNumber.setAttribute('aria-label', t('Tempo in BPM', 'سرعت قطعه برحسب BPM'));
  el('span', tempoControl, 'BPM', 'score-tempo-unit');
  tempoNumber.onchange = () => {
    if (!tempoNumber.reportValidity() || !setEtudeTempo(Number(tempoNumber.value)))
      tempoNumber.value = String(e.bpm);
  };

  const meterWrap=el('label',timeControls,undefined,'score-meter-control');
  el('span',meterWrap,t('Time signature','میزان‌نما'));
  meterSelect=el('select',meterWrap);
  meterSelect.setAttribute('aria-label',t('Time signature','میزان‌نما'));
  const meterPlaceholder=el('option',meterSelect,
    t('Select a time signature…','انتخاب میزان‌نما…'));
  meterPlaceholder.value='';
  meterPlaceholder.disabled=true;
  for(const meter of METER_PRESETS){
    const name=meter==='none'?t('Free (no meter)','آزاد (بدون میزان)'):meter;
    const option=el('option',meterSelect,name);
    option.value=meter;
  }
  meterSelect.value=composer.needsMeterChoice() ? '' : (e.meter||'none');
  meterSelect.disabled=Boolean(rec);
  meterSelect.onchange=()=>{
    const selected=meterSelect.value;
    if (!selected) return;
    const proposed={...e,meter:selected};
    if(meterTimeline(proposed).issues.length){
      meterMessage(
        'This etude contains timing that cannot be written exactly in '+selected+'. Adjust note/rest durations first or use Free.',
        'زمان‌بندی این اتود در میزان‌نما '+selected+' قابل نت‌نویسی دقیق نیست. ابتدا کشش نت‌ها و سکوت‌ها را اصلاح کنید یا حالت آزاد را نگه دارید.'
      );
      meterSelect.value=composer.needsMeterChoice() ? '' : (e.meter||'none');
      composer.syncMeter();
      return;
    }
    stopScorePlayback();
    stopRecordingMetronome();
    e.meter=selected;
    if(!meterInfo(e))metronomeEnabled=false;
    else startRecordingMetronome();
    if(meterInfo(e))
      e.measureCount=Math.max(e.measureCount||1,meterTimeline(e).bars.length);
    meterMessage('','');
    save();
    // Free has the same Pen note values and its own resizable note timeline.
    timelineToggle.hidden=Boolean(meterInfo(e));
    if(meterInfo(e))freeTimelineOpen=false;
    timelineToggle.setAttribute('aria-pressed',String(freeTimelineOpen));
    timelineToggle.classList.toggle('active',freeTimelineOpen);
    measureField.hidden=!meterInfo(e);
    measureNumber.value=String(e.measureCount||4);
    const metronomeToggle=$('.score-metronome');
    if(metronomeToggle)metronomeToggle.hidden=!meterInfo(e);
    composer.confirmMeterSelection();
    sheet();
  };
  const measureField=el('label',scoreBelowActions,undefined,'score-measure-count');
  measureField.hidden=!meterInfo(e);
  el('span',measureField,t('Measures','تعداد میزان'));
  const measureNumber=el('input',measureField);
  measureNumber.type='number';
  measureNumber.min='1';
  measureNumber.max='256';
  measureNumber.step='1';
  measureNumber.value=String(e.measureCount||4);
  measureNumber.setAttribute('aria-label',t('Number of measures','تعداد میزان‌ها'));
  measureNumber.onchange=()=>{
    const count=Number(measureNumber.value);
    if(!Number.isInteger(count)||count<1||count>256){
      measureNumber.value=String(e.measureCount||4);
      return;
    }
    const proposed={...e,measureCount:count};
    const result=meterTimeline(proposed);
    if(result.issues.length||result.bars.length>count){
      meterMessage(
        'The requested number of measures would cut off existing notes.',
        'تعداد میزان انتخابی برای نت‌های موجود کافی نیست.'
      );
      measureNumber.value=String(e.measureCount||4);
      return;
    }
    e.measureCount=count;
    meterMessage('','');
    save();
    sheet();
  };
  const penValue=el('label',scoreBelowActions,undefined,'score-pen-length');
  el('span',penValue,t('Pen note value','کشش نت با مداد'));
  const penSelect=el('select',penValue);
  const values=[
    [4,'Whole / گرد'],[3,'Dotted half / سفید نقطه‌دار'],
    [2,'Half / سفید'],[1.5,'Dotted quarter / سیاه نقطه‌دار'],
    [1,'Quarter / سیاه'],[.75,'Dotted eighth / چنگ نقطه‌دار'],
    [.5,'Eighth / چنگ'],[.375,'Dotted sixteenth / دولاچنگ نقطه‌دار'],
    [.25,'Sixteenth / دولاچنگ'],[.125,'Thirty-second / سه‌لاچنگ']
  ];
  for(const [beats,display] of values){
    const option=el('option',penSelect,display);
    option.value=String(beats);
  }
  if(!values.some(([value])=>value===penQuarterBeats))penQuarterBeats=1;
  penSelect.value=String(penQuarterBeats);
  penSelect.onchange=()=>{penQuarterBeats=Number(penSelect.value)};
  const timelineToggle=btn(scoreBelowActions,'',()=>{
    freeTimelineOpen=!freeTimelineOpen;
    timelineToggle.setAttribute('aria-pressed',String(freeTimelineOpen));
    timelineToggle.classList.toggle('active',freeTimelineOpen);
    sheet();
  },t('Free timeline: resize notes','تایم‌لاین آزاد: تغییر کشش نت‌ها'));
  timelineToggle.className='score-free-timeline-toggle';
  timelineToggle.hidden=Boolean(meterInfo(e));
  timelineToggle.setAttribute('aria-pressed',String(freeTimelineOpen));
  timelineToggle.append(scoreToolIcon('timeline'));
  el('span',timelineToggle,t('Timeline','تایم‌لاین'));
  const meterStatus=el('p',scoreBelowActions,undefined,'score-meter-status');
  meterStatus.setAttribute('role','status');
  meterStatus.hidden=true;


  // Practice Sequence is authored here in Studio, not in the learner player.
  // The editor reads/writes the same e.practiceSequence used by AI and export.
  practiceHost=el('div',app,undefined,'studio-practice-host');
  const expanded = practiceToExpand ? [practiceToExpand] : [];
  practiceToExpand = null;
  renderStudioPractice(practiceHost,e,{fa,save,expanded,
    locked:composer.isPracticeLocked()});
  sheet()
}

function cancel() {
  stopRecordingMetronome();
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
  const activeMeter=meterInfo(e);
  if(activeMeter) el('p',p,t('Time signature','میزان‌نما')+': '+
    activeMeter.meter+' · '+t('Measures','میزان‌ها')+': '+
    meterTimeline(e).bars.length,'practice-meter-summary');
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
      if(activeMeter){
        const length=activeMeter.barQuarterBeats*activeMeter.quarterSeconds;
        progressLabel.textContent+=' · '+t('Measure','میزان')+' '+
          (Math.floor((n.at+1e-7)/length)+1).toLocaleString(fa?'fa':'en');
      }
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
        if(activeMeter) {
          // Show the actual canonical measured score; moving a note to t=0
          // would give the learner the wrong measure/rest context.
          score(h,e,{selected:new Set([e.notes.indexOf(n)])});
        } else {
          score(h, {...e,notes:[{...n,at:0}]});
        }
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

// The Studio and Practice libraries share one card renderer and visual
// component. Only the destination route differs; both retain their delete
// action and the same imported/owned metadata.
function renderLibraryEtudeCard(section, id, entry, destination) {
  const card=el('div',section,undefined,'etude-card');
  const item=el('button',card,undefined,'etude-item');
  item.type='button';
  const name=entry.data.title||t('Untitled etude','اتود بدون نام');
  el('strong',item,name);
  el('small',item,entry.data.notes.length.toLocaleString(fa?'fa':'en')+' '+t('notes','نت'));
  item.onclick=()=>navigateTo(destination,id);
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

function etudeList(){
  const actions=row(app);
  // Same buttons and click callbacks on every viewport; only labels and
  // their container position adapt to the narrow library header.
  const responsiveAction=(button,shortLabel)=>{
    const originalLabel=button.textContent;
    button.textContent='';
    el('span',button,originalLabel,'library-desktop-action-label');
    el('span',button,shortLabel,'library-mobile-action-label');
    button.setAttribute('aria-label',originalLabel);
    return button;
  };
  if(page==='studio')responsiveAction(btn(actions,t('New etude','ساخت اتود'),()=>{
    navigateTo('studio',addEtude(fresh(),'own'));
  }),t('New','جدید')).className='primary';
  responsiveAction(btn(actions,t('Import etude','وارد کردن اتود'),
    ()=>$('#file').click()),t('Import','وارد کردن'));
  const grid=el('div',app,undefined,'shelves');
  for(const [origin,title] of [['own',t('My etudes','اتودهای من')],['imported',t('Imported etudes','اتودهای واردشده')]]){
    const section=el('section',grid);
    el('h2',section,title);
    const entries=[...collection.entries()].filter(([,entry])=>entry.origin===origin);
    if(!entries.length)el('p',section,origin==='own'?t('No etudes created yet.','هنوز اتودی نساخته‌اید.'):t('No files imported yet.','هنوز فایلی وارد نکرده‌اید.'));
    for(const [id,entry] of entries.reverse())
      renderLibraryEtudeCard(section,id,entry,page);
  }
}


function mobileNavigationIcon(route) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('mobile-nav-icon');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',{
    home:'M3 10 12 3l9 7v11h-6v-7H9v7H3V10Z',
    studio:'M9 19V6l11-2v12M9 19c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Zm11-3c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Z',
    practice:'M5 5h14M5 12h14M5 19h14M9 2v20',
    settings:'M4 7h16M4 17h16M9 4v6M15 14v6'
  }[route]||'');
  svg.append(path);
  return svg;
}

// Mobile preferences delegate to the existing desktop actions. The
// underlying language/theme state and persistence remain single-source.

// Mobile Appearance icons are decorative; theme selection still uses the
// existing #theme handler and persisted preference.
function mobileAppearanceIcon(mode) {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.classList.add('mobile-appearance-icon');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  const path=document.createElementNS(ns,'path');
  if(mode==='dark'){
    path.setAttribute('d','M20.5 13.2A8.6 8.6 0 0 1 10.8 3.5a8.6 8.6 0 1 0 9.7 9.7Z');
  }else{
    const circle=document.createElementNS(ns,'circle');
    circle.setAttribute('cx','12');
    circle.setAttribute('cy','12');
    circle.setAttribute('r','4');
    svg.append(circle);
    path.setAttribute('d','M12 2v2m0 16v2M4 12H2m20 0h-2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42M6.35 17.65l-1.42 1.42');
  }
  svg.append(path);
  return svg;
}

function openMobileSettings(trigger) {
  document.querySelector('.mobile-settings-dialog')?.close();
  const dialog=el('dialog',document.body,undefined,'mobile-settings-dialog');
  dialog.setAttribute('aria-labelledby','mobile-settings-title');
  const top=el('div',dialog,undefined,'mobile-settings-heading');
  const heading=el('h2',top,t('Settings','تنظیمات'));
  heading.id='mobile-settings-title';
  const close=btn(top,'×',()=>dialog.close(),t('Close settings','بستن تنظیمات'));
  close.className='mobile-settings-close';
  close.setAttribute('aria-label',t('Close settings','بستن تنظیمات'));

  const language=el('section',dialog,undefined,'mobile-settings-group');
  el('h3',language,t('Language','زبان'));
  const langChoices=el('div',language,undefined,'mobile-settings-choices');
  for(const [value,label] of [['fa','فارسی'],['en','English']]){
    const selected=(value==='fa')===fa;
    const option=btn(langChoices,label,()=>{
      if((value==='fa')===fa){dialog.close();return;}
      dialog.close();
      $('#lang').click();
    });
    option.className='mobile-settings-choice';
    option.setAttribute('aria-pressed',String(selected));
    option.classList.toggle('active',selected);
  }

  const appearance=el('section',dialog,undefined,'mobile-settings-group');
  el('h3',appearance,t('Appearance','ظاهر'));
  const themeChoices=el('div',appearance,undefined,'mobile-settings-choices');
  const choices=[];
  for(const [value,en,ir] of [['light','Light','روشن'],['dark','Dark','تاریک']]){
    const option=btn(themeChoices,t(en,ir),()=>{
      if((value==='dark')!==dark)$('#theme').click();
      for(const choice of choices){
        const current=(choice.value==='dark')===dark;
        choice.button.classList.toggle('active',current);
        choice.button.setAttribute('aria-pressed',String(current));
      }
    });
    option.className='mobile-settings-choice mobile-settings-appearance-choice';
    option.prepend(mobileAppearanceIcon(value));
    option.setAttribute('aria-pressed',String((value==='dark')===dark));
    option.classList.toggle('active',(value==='dark')===dark);
    choices.push({value,button:option});
  }

  trigger.setAttribute('aria-expanded','true');
  dialog.addEventListener('close',()=>{
    trigger.setAttribute('aria-expanded','false');
    dialog.remove();
    if(trigger.isConnected)trigger.focus();
  },{once:true});
  dialog.addEventListener('click',event=>{
    if(event.target===dialog)dialog.close();
  });
  dialog.showModal();
}


// Reparent the EXISTING library actions only on narrow mobile layouts.
// The original row is restored before the shelves when widened to Desktop.
// Old detached controls are discarded after route changes/re-renders.
const mobileLibraryLayout=window.matchMedia('(max-width: 719px)');
function syncMobileLibraryActions(){
  const library=app.querySelector(':scope > .shelves');
  const intro=page==='studio'
    ?document.querySelector('#etudes-design-controls .etudes-design-intro')
    :page==='practice'
      ?document.querySelector('#practice-design-controls .practice-design-intro')
      :null;
  const fromApp=app.querySelector(':scope > .row.controls');
  const current=library?(fromApp||intro?.querySelector('.mobile-library-actions')):null;
  for(const stale of document.querySelectorAll('.mobile-library-actions'))
    if(stale!==current)stale.remove();
  if(!library||!intro||!current)return;
  if(mobileLibraryLayout.matches){
    if(current.parentElement!==intro)intro.append(current);
    current.classList.add('mobile-library-actions');
  }else{
    if(current.parentElement!==app)app.insertBefore(current,library);
    current.classList.remove('mobile-library-actions');
  }
}
mobileLibraryLayout.addEventListener('change',syncMobileLibraryActions);

function render() {
  if(mobileSignatureDialog){
    if(mobileSignatureDialog.open)mobileSignatureDialog.close();
    mobileSignatureDialog.remove();
    mobileSignatureDialog=null;
  }
  document.documentElement.lang = fa ? 'fa' : 'en';
  document.documentElement.dir = fa ? 'rtl' : 'ltr';
  document.documentElement.classList.toggle('dark', dark);
  $('#theme').title = t('Change theme', 'تغییر پوسته');
  $('#lang').textContent = fa ? 'English' : 'فارسی';
  const nav = $('#nav');
  nav.replaceChildren();
  const routes = [['home',t('Home','خانه')],['studio',t('Etudes','اتودها')],['practice',t('Practice','تمرین')]];
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
    // Preserve full Desktop nav text, show concise mobile tab titles.
    item.textContent='';
    el('span',item,name,'desktop-nav-label');
    el('span',item,key==='studio'?t('Etudes','اتودها')
      :key==='practice'?t('Practices','تمرین‌ها')
      :t('Home','خانه'),'mobile-nav-label');
    item.prepend(mobileNavigationIcon(key));
    btn(footNav,name,()=>navigate(key));
  }
  const settingsTab=btn(nav,t('Settings','تنظیمات'),()=>{
    openMobileSettings(settingsTab);
  },t('Settings','تنظیمات'));
  settingsTab.className='mobile-settings-tab';
  settingsTab.setAttribute('aria-haspopup','dialog');
  settingsTab.setAttribute('aria-expanded','false');
  settingsTab.prepend(mobileNavigationIcon('settings'));
  app.replaceChildren();
  app.dataset.page=page;
  document.body.classList.toggle('home-screen',page==='home');
  // Explicit editor-only marker for phone navigation (not the Etudes list).
  document.body.classList.toggle('studio-editor-screen',page==='studio' && Boolean(activeId));
  const name=routes.find(([key])=>key===page)[1];
  const pageTitle=page==='studio' && activeId?t('Etude Studio','استودیوی اتود'):name;
  document.title=pageTitle+' · Goosh';
  if(page!=='home')el('h1',app,pageTitle);
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
  syncMobileLibraryActions();
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
window.addEventListener('blur', () => {
  stopKeys();
  stopRecordingMetronome();
});
window.addEventListener('focus', () => {
  if(rec&&metronomeEnabled)startRecordingMetronome();
});
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
  if(page==='studio'&&activeId&&!rec&&!typing&&!ev.repeat&&
     !ev.ctrlKey&&!ev.altKey&&!ev.metaKey&&
     rangeSelectionActive&&sel.size&&
     (ev.code==='Delete'||ev.code==='Backspace')){
    ev.preventDefault();
    eraseScoreNotes([...sel]);
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
