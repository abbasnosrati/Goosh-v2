import { validatePracticeSequence } from './practice-model.js'
export const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
export const label = m => names[m % 12] + (Math.floor(m / 12) - 1)
export const fresh = () => ({
  version: 1,
  title: '',
  bpm: 90,
  meter: 'none',
  measureCount: 4,
  notes: [],
  practiceSequence: [],
  musicContext: null,
  marks: {
    '♭': -100,
    '♯': 100,
    'کرن': -50,
    'سری': 50
  },
  key: {},
  offset: {},
  rule: {
    mode: 'piano',
    order: 'listen',
    staff: false,
    tuner: false,
    listen: 2,
    answer: 5,
    count: 3,
    ref: 'off',
    refMidi: 69,
    repeat: 1,
    refTime: 1
  }
})
export function freq(e, m) {
  const pc = m % 12;
  return 440 * 2 ** ((m - 69 + ((e.offset[pc] || 0) + (e.marks[e.key[pc]] || 0)) / 100) / 12)
}
export function valid(e) {
  const finite = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
  return e?.version === 1 && typeof e.title === 'string' && finite(e.bpm, 20, 300) && (e.meter == null || METER_PRESETS.includes(e.meter)) &&
    (e.measureCount == null || (Number.isInteger(e.measureCount) &&
      e.measureCount >= 1 && e.measureCount <= 256)) && Array.isArray(e.notes) && e.notes.every(n => Number.isInteger(n.m) && finite(n.m, 0, 127) && finite(n.at, 0, 1e7) && finite(n.d, .001, 1e5)) && [e.marks, e.key, e.offset].every(x => x && typeof x === 'object' && !Array.isArray(x)) && Object.values(e.marks).every(x => finite(x, -1200, 1200)) && Object.values(e.offset).every(x => finite(x, -1200, 1200)) && Object.values(e.key).every(x => Object.hasOwn(e.marks, x)) && validatePracticeSequence(e.practiceSequence) &&
    (e.musicContext == null ||
      (e.musicContext && typeof e.musicContext === 'object' && !Array.isArray(e.musicContext) &&
       ['iranian','western'].includes(e.musicContext.musicSystem) &&
       (e.musicContext.musicSystem === 'iranian'
         ? typeof e.musicContext.dastgah === 'string' && e.musicContext.dastgah.length <= 32
         : typeof e.musicContext.scale === 'string' && e.musicContext.scale.length <= 32 &&
           typeof e.musicContext.tonic === 'string' && e.musicContext.tonic.length <= 3))) && e.rule && ['mic', 'text', 'piano'].includes(e.rule.mode) && ['listen', 'answer'].includes(e.rule.order) && ['off', 'first', 'each'].includes(e.rule.ref) && ['listen', 'answer', 'refTime'].every(k => finite(e.rule[k], .1, 120)) && finite(e.rule.count, 0, 30) && Number.isInteger(e.rule.repeat) && finite(e.rule.repeat, 1, 12) && Number.isInteger(e.rule.refMidi) && finite(e.rule.refMidi, 0, 127)
}

// One canonical rhythmic timeline for BOTH metered and free Etudes.
// Audio, recording, score and practice continue using e.notes[{m,at,d}] in
// seconds; e.meter only describes how that timeline is engraved and checked.
// This is NOT an independent playback engine or a second note collection.
export const METER_PRESETS = Object.freeze([
  'none','2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'
]);
export const RHYTHM_TICKS_PER_QUARTER = 960;
const MIN_NOTATABLE_TICKS = 30; // double-dotted 32nd resolution
const NOTE_VALUES = Object.freeze([
  3840,3360,2880,1920,1680,1440,960,840,720,480,
  420,360,240,210,180,120
]);
export function meterInfo(etude) {
  const meter = etude?.meter || 'none';
  if (!METER_PRESETS.includes(meter)) throw Error('Unsupported time signature');
  if (meter === 'none') return null;
  const [numerator,denominator] = meter.split('/').map(Number);
  const quarterSeconds = 60 / etude.bpm;
  return {
    meter,numerator,denominator,quarterSeconds,
    barQuarterBeats:numerator*4/denominator,
    barTicks:numerator*RHYTHM_TICKS_PER_QUARTER*4/denominator
  };
}
// Exact notation decomposes arbitrary supported durations into notated values
// joined by ties. The result is derived; it never retimes the original notes.
function splitNotatedTicks(total) {
  const values = [];
  let left = total;
  for (const ticks of NOTE_VALUES) {
    while (left >= ticks) {values.push(ticks);left-=ticks;}
  }
  return left === 0 ? values : null;
}
export function meterTimeline(etude) {
  const meter = meterInfo(etude);
  if (!meter) return {meter:null,bars:[],issues:[],measured:false};
  const issues = [];
  const tick = seconds => {
    const raw = seconds / meter.quarterSeconds * RHYTHM_TICKS_PER_QUARTER;
    const rounded = Math.round(raw/MIN_NOTATABLE_TICKS)*MIN_NOTATABLE_TICKS;
    // Distinguish a genuinely rhythmic value from free-time recordings.
    if (!Number.isFinite(raw) || Math.abs(raw-rounded)>1.5)
      return null;
    return rounded;
  };
  let end=0;
  const originals=[];
  for (const [index,n] of etude.notes.entries()) {
    const start=tick(n.at),duration=tick(n.d);
    if (start===null || duration===null || duration<=0 ||
        !splitNotatedTicks(duration)) {
      issues.push({kind:'unnotatable',index});
      continue;
    }
    originals.push({index,n,start,end:start+duration});
    end=Math.max(end,start+duration);
  }
  if (issues.length) return {meter,bars:[],issues,measured:true};
  // An explicit measure count lets the teacher begin with empty bars before
  // writing any notes. It is layout metadata, NOT a second note timeline.
  const barCount=Math.max(etude.measureCount||1,Math.ceil(end/meter.barTicks));
  if (barCount>256) return {meter,bars:[],issues:[{kind:'too-many-bars'}],measured:true};
  const bars=Array.from({length:barCount},(_,index)=>({
    index,start:index*meter.barTicks,end:(index+1)*meter.barTicks,
    notes:[],rests:[],events:[]
  }));
  for (const original of originals) {
    let position=original.start;
    while (position<original.end) {
      const index=Math.floor(position/meter.barTicks);
      const boundary=(index+1)*meter.barTicks;
      const total=Math.min(original.end,boundary)-position;
      const components=splitNotatedTicks(total);
      if (!components) {
        issues.push({kind:'unnotatable-crossing',index:original.index});
        break;
      }
      for(const duration of components){
        const endOfPiece=position+duration;
        bars[index].notes.push({
          index:original.index,note:original.n,at:position,duration,
          tieFrom:position>original.start,
          tieTo:endOfPiece<original.end
        });
        position=endOfPiece;
      }
    }
  }
  if(issues.length)return {meter,bars:[],issues,measured:true};
  for (const bar of bars) {
    // Rests represent true silence, not time spent sustaining a chord.
    const ranges=bar.notes.map(n=>[
      n.at,Math.min(bar.end,n.at+n.duration)
    ]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    let cursor=bar.start;
    for(const [from,to] of ranges){
      if(from>cursor){
        const segments=splitNotatedTicks(from-cursor);
        if(!segments){issues.push({kind:'unnotatable-rest',bar:bar.index});break;}
        for(const duration of segments){bar.rests.push({at:cursor,duration});cursor+=duration;}
      }
      cursor=Math.max(cursor,to);
    }
    if(cursor<bar.end){
      const segments=splitNotatedTicks(bar.end-cursor);
      if(!segments)issues.push({kind:'unnotatable-rest',bar:bar.index});
      else for(const duration of segments){bar.rests.push({at:cursor,duration});cursor+=duration;}
    }
    // A completely silent bar is conventionally notated by ONE full-bar
    // rest, regardless of the numerator/denominator (e.g. 6/8 or 9/8).
    if (!bar.notes.length)
      bar.rests=[{at:bar.start,duration:meter.barTicks,wholeMeasure:true}];
    const byOnset=new Map();
    for(const note of bar.notes){
      if(!byOnset.has(note.at))byOnset.set(note.at,[]);
      byOnset.get(note.at).push(note);
    }
    bar.events=[
      ...[...byOnset].map(([at,entries])=>({
        type:'notes',at:at*meter.quarterSeconds/RHYTHM_TICKS_PER_QUARTER,
        duration:Math.max(...entries.map(x=>x.duration))*
          meter.quarterSeconds/RHYTHM_TICKS_PER_QUARTER,
        entries:entries.map(piece=>({
          index:piece.index,
          note:{...piece.note,
            d:piece.duration*meter.quarterSeconds/RHYTHM_TICKS_PER_QUARTER},
          tieFrom:piece.tieFrom,tieTo:piece.tieTo
        })),
        barIndex:bar.index
      })),
      ...bar.rests.map(piece=>({
        type:'rest',at:piece.at*meter.quarterSeconds/RHYTHM_TICKS_PER_QUARTER,
        duration:piece.duration*meter.quarterSeconds/RHYTHM_TICKS_PER_QUARTER,
        wholeMeasure:Boolean(piece.wholeMeasure),
        barIndex:bar.index
      }))
    ].sort((a,b)=>a.at-b.at||(a.type==='notes'?-1:1));
    bar.events.push({
      type:'barline',at:bar.end*meter.quarterSeconds/RHYTHM_TICKS_PER_QUARTER,
      duration:0,barIndex:bar.index
    });
  }
  return {meter,bars:issues.length?[]:bars,issues,measured:true};
}
