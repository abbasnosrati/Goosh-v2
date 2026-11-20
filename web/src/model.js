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
  'none','2/4','3/4','4/4','6/4','6/8','6/16','7/8','5/8'
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


// Score SELECT horizontal dragging reorders notation slots; it does NOT
// drag note.at along a continuous timeline. All calculations use the same
// e.notes and meterTimeline() as playback, Pen, Eraser and Practice.
// Returns a proposed set of at edits without mutating any note; the caller
// applies all of them together after validating the destination.
export function planScoreNoteReorder(etude, sourceIndex, target) {
  const notes=etude.notes, EPS=1e-7;
  const invalid=reason=>({ok:false,reason,moves:[]});
  const unchanged=()=>({ok:true,kind:'same',moves:[]});
  if(!Number.isInteger(sourceIndex)||sourceIndex<0||sourceIndex>=notes.length||
     !target||!Number.isFinite(target.at))
    return invalid('invalid');
  const source=notes[sourceIndex];
  const meter=meterInfo(etude);
  if(meter&&meterTimeline(etude).issues.length)return invalid('invalid-meter');

  // Keep simultaneous chord members together when *other* groups move past
  // them. Pulling a single member out of a chord requires per-voice rhythm
  // semantics and must not silently destroy the chord or invent a rest.
  const groupNotes=entries=>{
    const groups=[];
    for(const item of entries.sort((a,b)=>a.note.at-b.note.at||a.index-b.index)){
      const last=groups[groups.length-1];
      if(last&&Math.abs(last.at-item.note.at)<EPS){
        last.indices.push(item.index);
        last.duration=Math.max(last.duration,item.note.d);
      }else groups.push({
        kind:'note',indices:[item.index],at:item.note.at,
        duration:item.note.d
      });
    }
    return groups;
  };
  const all=notes.map((note,index)=>({note,index}));
  const validateGroups=groups=>{
    let previousEnd=0;
    for(const g of groups){
      if(g.at<previousEnd-EPS)return false;
      if(g.indices.some(i=>Math.abs(notes[i].d-g.duration)>EPS))
        return false;
      previousEnd=Math.max(previousEnd,g.at+g.duration);
    }
    return true;
  };
  const createMoves=positions=>{
    const moves=[...positions].filter(([index,at])=>
      Math.abs(notes[index].at-at)>EPS).map(([index,at])=>({index,at}));
    if(moves.some(({index,at})=>!Number.isFinite(at)||at<0||
      at>1e7||at+notes[index].d>1e7))return invalid('out-of-range');
    if(meter){
      const proposed=notes.map((note,index)=>{
        const item=moves.find(change=>change.index===index);
        return item?{...note,at:item.at}:note;
      });
      const timeline=meterTimeline({...etude,notes:proposed});
      if(timeline.issues.length||timeline.bars.length>(etude.measureCount||4))
        return invalid('invalid-meter');
    }
    return {ok:true,kind:meter?'metered':'free',moves};
  };

  if(!meter){
    // In Free, "third note to eighth note" means reorder the note
    // sequence, not nudge playback by milliseconds. Intentional silent
    // gaps stay attached to their ordinal slots and are not manufactured
    // by dragging a few pixels.
    if(target.type!=='note')return unchanged();
    const groups=groupNotes(all);
    const src=groups.findIndex(g=>g.indices.includes(sourceIndex));
    const dst=groups.findIndex(g=>Math.abs(g.at-target.at)<EPS);
    if(src<0||dst<0)return invalid('missing-slot');
    if(src===dst)return unchanged();
    if(groups[src].indices.length>1||!validateGroups(groups))
      return invalid('polyphony');
    const gaps=groups.map((g,i)=>
      Math.max(0,g.at-(i?groups[i-1].at+groups[i-1].duration:0)));
    const order=groups.slice();
    const [moving]=order.splice(src,1);
    order.splice(dst,0,moving);
    const positions=new Map();
    let cursor=0;
    order.forEach((g,i)=>{
      cursor+=gaps[i];
      for(const index of g.indices)positions.set(index,cursor);
      cursor+=g.duration;
    });
    const result=createMoves(positions);
    if(result.ok)result.kind='reorder';
    return result;
  }

  const barLength=meter.barQuarterBeats*meter.quarterSeconds;
  const sourceBar=Math.floor((source.at+EPS)/barLength);
  const destinationBar=target.barIndex;
  if(!Number.isInteger(destinationBar)||destinationBar<0||
     destinationBar>=(etude.measureCount||4))return invalid('missing-slot');

  function barSlots(barIndex){
    const start=barIndex*barLength,end=start+barLength;
    // Dragging a tied note across a barline or into a polyphonic overlap
    // should be a separately designed per-voice feature, not an accidental
    // rewrite of both measures.
    for(const n of notes){
      if(n.at<end-EPS&&n.at+n.d>start+EPS&&
         (n.at<start-EPS||n.at+n.d>end+EPS))return null;
    }
    const groups=groupNotes(all.filter(({note})=>
      note.at>=start-EPS&&note.at<end-EPS));
    if(!validateGroups(groups))return null;
    const blocks=[];
    let cursor=start;
    for(const group of groups){
      if(group.at>cursor+EPS)blocks.push({
        kind:'rest',at:cursor,duration:group.at-cursor
      });
      blocks.push(group);
      cursor=group.at+group.duration;
    }
    if(cursor<end-EPS)blocks.push({
      kind:'rest',at:cursor,duration:end-cursor
    });
    return blocks;
  }
  const from=barSlots(sourceBar);
  const to=sourceBar===destinationBar?from:barSlots(destinationBar);
  if(!from||!to)return invalid('polyphony');
  const sourceSlot=from.findIndex(b=>b.kind==='note'&&
    b.indices.includes(sourceIndex));
  if(sourceSlot<0)return invalid('missing-slot');
  const destSlot=to.findIndex(b=>b.kind===target.type&&(
    b.kind==='note'?Math.abs(b.at-target.at)<EPS:
    target.at>=b.at-EPS&&target.at<b.at+b.duration-EPS));
  if(destSlot<0)return invalid('missing-slot');
  if(sourceBar===destinationBar&&sourceSlot===destSlot)return unchanged();
  // A chord member can move vertically without touching the group onset;
  // only horizontal separation of a single voice needs special handling.
  if(from[sourceSlot].indices.length!==1)return invalid('polyphony');

  const changes=new Map();
  const reflow=(blocks,barIndex)=>{
    let time=barIndex*barLength;
    for(const block of blocks){
      if(block.kind==='note')
        for(const index of block.indices)changes.set(index,time);
      time+=block.duration;
    }
    return Math.abs(time-(barIndex+1)*barLength)<1e-6;
  };

  if(sourceBar===destinationBar){
    // Swap a note with another whole note/chord slot OR an actual silent
    // slot. All lengths stay attached to their own events, so the bar's
    // total capacity stays exactly fixed.
    const order=from.slice();
    [order[sourceSlot],order[destSlot]]=[order[destSlot],order[sourceSlot]];
    if(!reflow(order,sourceBar))return invalid('invalid-meter');
    const result=createMoves(changes);
    if(result.ok)result.kind='swap';
    return result;
  }

  // Inter-measure move: the old position becomes a rest of EXACTLY the
  // removed note's duration. The destination bar can accept the incoming
  // note only when it has enough existing silence. We reflow other events
  // *within that bar*; we NEVER discard notes or overflow unnoticed.
  const moved=from[sourceSlot];
  const destination=to.slice();
  const rests=destination.map((block,i)=>({block,i}))
    .filter(item=>item.block.kind==='rest')
    .sort((a,b)=>a.i===destSlot?-1:b.i===destSlot?1:
      Math.abs(a.i-destSlot)-Math.abs(b.i-destSlot));
  const free=rests.reduce((sum,item)=>sum+item.block.duration,0);
  if(free+EPS<moved.duration)return invalid('no-room');
  let needed=moved.duration;
  for(const {block} of rests){
    if(needed<=EPS)break;
    const used=Math.min(needed,block.duration);
    block.duration-=used;
    needed-=used;
  }
  if(needed>EPS)return invalid('no-room');
  const insertAt=destination.slice(0,destSlot)
    .filter(block=>block.duration>EPS).length;
  const updatedDestination=destination.filter(block=>block.duration>EPS);
  updatedDestination.splice(insertAt,0,moved);
  const updatedSource=from.slice();
  updatedSource[sourceSlot]={
    kind:'rest',at:moved.at,duration:moved.duration
  };
  if(!reflow(updatedSource,sourceBar)||
     !reflow(updatedDestination,destinationBar))return invalid('invalid-meter');
  const result=createMoves(changes);
  if(result.ok)result.kind='transfer';
  return result;
}
