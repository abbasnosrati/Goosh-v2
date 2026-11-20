import {isPersianAccidental, appendPersianAccidental}
  from './persian-accidentals.js?v=persian-marks-1'
import {orderedSignatureEntries} from './music-signature.js'
import {meterTimeline} from './model.js'

const ns = 'http://www.w3.org/2000/svg',
  steps = [0,0,1,1,2,3,3,4,4,5,5,6]
const step = m => Math.floor(m/12)*7 + steps[m%12]-37
const lengths = [['whole',4],['half',2],['quarter',1],['eighth',.5],['sixteenth',.25],['thirty-second',.125]]

// Derive notation from existing seconds and BPM; do not alter the sounding notes.
function symbol(beats) {
  const options = lengths.flatMap(([kind,value])=>[0,1,2].map(dots=>({
    kind,dots,value:value*(dots===2?1.75:dots===1?1.5:1)
  })))
  const best=options.reduce((a,b)=>Math.abs(Math.log(beats/b.value)) <
    Math.abs(Math.log(beats/a.value))?b:a)
  return {...best,exact:Math.abs(beats-best.value)<Math.max(.005,best.value*.012)}
}
export function score(host,e,{zoom=1,wrap=true,selected=new Set(),pick,insert,move,tool='select',fa=false}={}) {
  host.replaceChildren()
  const second=60/(e.bpm||90),width=Math.max(240,host.clientWidth||700)
  const timeline=meterTimeline(e)
  const measured=timeline.measured && !timeline.issues.length
  const margin=64+Object.keys(e.key).length*17+(measured?34:0)
  let events=[]
  if(measured){
    // These events are derived from exactly the SAME e.notes timeline as
    // free meter. No second editing, recording or playback engine.
    events=timeline.bars.flatMap(bar=>bar.events)
  }else{
    const ordered=e.notes.map((note,index)=>({note,index})).sort((a,b)=>
      a.note.at-b.note.at||a.index-b.index)
    const groups=[]
    for(const item of ordered){
      const g=groups[groups.length-1]
      if(g&&Math.abs(g.at-item.note.at)<1e-7){
        g.entries.push(item);g.duration=Math.max(g.duration,item.note.d)
      }else groups.push({type:'notes',at:item.note.at,duration:item.note.d,entries:[item]})
    }
    let soundingUntil=0
    for(const g of groups){
      if(g.at-soundingUntil>second*.025)
        events.push({type:'rest',at:soundingUntil,duration:g.at-soundingUntil})
      events.push(g)
      soundingUntil=Math.max(soundingUntil,g.at+g.duration)
    }
    if(!events.length)events.push({type:'empty',at:0,duration:second})
  }
  if(timeline.measured && timeline.issues.length){
    const note=document.createElement('p')
    note.className='score-meter-warning'
    note.textContent=fa
      ? 'این زمان‌بندی با کسر میزان انتخاب‌شده قابل نت‌نویسی دقیق نیست. کشش‌ها را اصلاح کنید یا حالت آزاد را انتخاب کنید.'
      : 'The current timing cannot be engraved exactly in this meter. Correct the durations or switch to Free meter.'
    host.append(note)
  }
  const rows=[]
  let items=[],cursor=margin+16
  const spanFor=ev=>{
    const beats=Math.max(.125,ev.duration/second)
    return Math.max(26,Math.min(100,36*zoom*(.85+.48*Math.sqrt(Math.min(16,beats)))))
  }
  for(let i=0;i<events.length;i++){
    const ev=events[i],span=spanFor(ev)
    // Prefer a clean system break at a barline rather than splitting a
    // measure between two staff rows when the entire measure can fit.
    if(measured && wrap && items.length &&
      (i===0 || ev.barIndex!==events[i-1].barIndex)){
      let measureWidth=0
      for(let j=i;j<events.length&&events[j].barIndex===ev.barIndex;j++)
        measureWidth+=spanFor(events[j])
      if(cursor+measureWidth>width-10 && margin+16+measureWidth<=width-10){
        rows.push({items,extent:cursor});items=[];cursor=margin+16
      }
    }
    if(wrap&&items.length&&cursor+span>width-10){
      rows.push({items,extent:cursor});items=[];cursor=margin+16
    }
    ev.x=cursor;ev.span=span;items.push(ev);cursor+=span
  }
  rows.push({items,extent:cursor})
  const allGroups=rows.flatMap(row=>row.items.filter(ev=>ev.type==='notes'))
  const final=e.notes.reduce((end,n)=>Math.max(end,n.at+n.d),0)
  const CHORD_ZONE=11
  // Preview and click MUST use this same planner. A narrow horizontal
  // band centered on an existing note means simultaneous chord insertion;
  // the space before/between/after notes means sequential insertion.
  function planPlacement(rowIndex,x,forceChord=false) {
    const row=rows[rowIndex]
    const rowGroups=row.items.filter(ev=>ev.type==='notes')
    const closest=rowGroups.reduce((best,g)=>!best||Math.abs(g.x-x)<Math.abs(best.x-x)?g:best,null)
    if(closest&&(forceChord||Math.abs(closest.x-x)<=CHORD_ZONE))
      return {kind:'chord',at:closest.at,x:closest.x}
    if(measured){
      // In metered notation rest events have actual beat positions. Pencil
      // fills a rest (Eraser creates one) instead of shifting nearby notes.
      const target=row.items.reduce((best,ev)=>
        !best||Math.abs(ev.x-x)<Math.abs(best.x-x)?ev:best,null)
      if(target&&(target.type==='rest'||target.type==='barline')){
        const at=target.at
        const nextNote=e.notes.map(n=>n.at).filter(t=>t>at+1e-7)
          .reduce((a,b)=>Math.min(a,b),Infinity)
        return {kind:'rest',at,x:target.x,
          available:Number.isFinite(nextNote)?Math.max(0,nextNote-at):Infinity}
      }
    }
    if(!allGroups.length)return {kind:'after',at:0,x:row.items[0]?.x??margin+16}
    const next=rowGroups.find(g=>g.x>x)
    if(next) {
      const prevIndex=rowGroups.indexOf(next)-1
      const prev=rowGroups[prevIndex]
      const first=allGroups[0]
      return {
        kind:next===first?'before':'between',
        at:next.at,
        x:prev?Math.max(prev.x+13,(prev.x+next.x)/2):next.x-17
      }
    }
    // A click to the right of a wrapped row inserts before the first
    // event in the following row; only the actual final row appends.
    const nextGroup=rows.slice(rowIndex+1).flatMap(r=>r.items)
      .find(ev=>ev.type==='notes')
    if(nextGroup)return {
      kind:nextGroup===allGroups[0]?'before':'between',
      at:nextGroup.at,
      x:rowGroups.length?Math.min(row.extent-8,rowGroups[rowGroups.length-1].x+22):row.extent-12
    }
    if(!rowGroups.length){
      // Initial rests before the first note still need a proper slot.
      const first=allGroups[0]
      return {kind:'before',at:first.at,x:row.items[0]?.x??margin+16}
    }
    const last=rowGroups[rowGroups.length-1]
    return {kind:'after',at:final,x:Math.min(last.x+Math.max(19,last.span*.55),Math.max(last.x+19,row.extent-8))}
  }
  function pitchFromY(y){
    const staffStep=Math.round((104-Math.max(8,Math.min(161,y)))/4.5)
    let midi=60
    while(midi<108&&step(midi)<staffStep)midi++
    while(midi>24&&step(midi)>staffStep)midi--
    return midi
  }
  // The SELECT tool can move the existing note object, not produce a second
  // notation/audio timeline. Other notes keep their original start times.
  // In measured mode the same 1/32-note grid as piano recording is used.
  const dragMarkers = []
  const dragStep=measured?second/8:null
  function dragOnset(rowIndex,x,source){
    const row=rows[rowIndex]
    const notes=row.items.filter(ev=>ev.type==='notes')
    const near=notes.reduce((best,ev)=>
      !best||Math.abs(ev.x-x)<Math.abs(best.x-x)?ev:best,null)
    if(near&&Math.abs(near.x-x)<=CHORD_ZONE)
      return {at:near.at,x:near.x}
    const anchors=row.items.filter(ev=>Number.isFinite(ev.at))
    const left=[...anchors].reverse().find(ev=>ev.x<=x)
    const right=anchors.find(ev=>ev.x>x)
    let at
    if(left&&right){
      const fraction=(x-left.x)/(right.x-left.x)
      at=left.at+fraction*(right.at-left.at)
    }else if(left){
      at=left.at+(x-left.x)*second/Math.max(28,left.span)
    }else if(right){
      at=right.at-(right.x-x)*second/Math.max(28,right.span)
    }else at=source.at
    if(dragStep)at=Math.round(at/dragStep)*dragStep
    else at=Math.round(at*1000)/1000
    // Never silently relocate an overhanging note to the last valid slot:
    // measuredEditAllowed() will reject out-of-range drops explicitly.
    // The existing note model still bounds all absolute times to 1e7.
    return {at:Math.min(1e7,Math.max(0,at)),x}
  }
  function dragDestination(ev,source){
    let nearest=null
    for(const [index,row] of rows.entries()){
      const svg=row.svg
      if(!svg)continue
      const rect=svg.getBoundingClientRect()
      if(!rect.width||!rect.height)continue
      const distance=Math.max(0,rect.top-ev.clientY,ev.clientY-rect.bottom)
      const x=(ev.clientX-rect.left)*(row.width/rect.width)
      if(distance>18||x<3||x>row.width-3)continue
      if(!nearest||distance<nearest.distance)
        nearest={index,row,rect,x,distance}
    }
    if(!nearest)return null
    const {index,rect,x}=nearest
    const y=(ev.clientY-rect.top)*(165/rect.height)
    const m=pitchFromY(y)
    const timing=dragOnset(index,x,source)
    return {rowIndex:index,m,at:timing.at,
      x:Math.max(12,Math.min(nearest.row.width-12,timing.x)),
      y:104-step(m)*4.5}
  }
  function showDragPreview(destination){
    for(const marker of dragMarkers){
      if(marker)marker.group.setAttribute('display','none')
    }
    if(!destination)return
    const marker=dragMarkers[destination.rowIndex]
    if(!marker)return
    const {x,y}=destination
    marker.head.setAttribute('cx',x)
    marker.head.setAttribute('cy',y)
    marker.head.setAttribute('transform','rotate(-20 '+x+' '+y+')')
    marker.guide.setAttribute('x1',x)
    marker.guide.setAttribute('x2',x)
    marker.ledger.forEach((line,i)=>{
      const positions=[]
      for(let l=113;l<=y;l+=9)positions.push(l)
      for(let l=59;l>=y;l-=9)positions.push(l)
      line.setAttribute('display',i<positions.length?'inline':'none')
      if(i<positions.length){
        line.setAttribute('x1',x-10)
        line.setAttribute('x2',x+10)
        line.setAttribute('y1',positions[i])
        line.setAttribute('y2',positions[i])
      }
    })
    marker.group.setAttribute('display','inline')
  }
  for(const [rowIndex,row] of rows.entries()){
    const svg=document.createElementNS(ns,'svg')
    const w=wrap?width:Math.max(width,row.extent+16)
    svg.setAttribute('width',w);svg.setAttribute('height',165);host.append(svg)
    row.svg=svg
    row.width=w
    const draw=(tag,attrs,content)=>{
      const el=document.createElementNS(ns,tag)
      for(const k in attrs)el.setAttribute(k,attrs[k])
      if(content!==undefined)el.textContent=content
      svg.append(el);return el
    }
    const line=(x1,y1,x2,y2,extra={})=>draw('line',{
      x1,y1,x2,y2,stroke:'currentColor',...extra
    })
    for(let i=0;i<5;i++)line(4,104-9*i,w-4,104-9*i)
    if(tool==='pen'){
      // The inactive ledger guides are deliberately much fainter than the
      // five real staff lines; only visible while the pencil is selected.
      for(const y of [14,23,32,41,50,59,113,122,131,140,149,158])
        line(4,y,w-4,y,{'stroke-width':.7,'stroke-opacity':.13,
          'stroke-dasharray':'2 8','pointer-events':'none'})
    }
    draw('text',{x:7,y:103,'font-size':46,fill:'currentColor'},'𝄞')
    if(measured && rowIndex===0){
      const x=46+Object.keys(e.key).length*17
      draw('text',{x,y:82,'font-size':19,'font-weight':700,
        fill:'currentColor','text-anchor':'middle'},String(timeline.meter.numerator))
      draw('text',{x,y:101,'font-size':19,'font-weight':700,
        fill:'currentColor','text-anchor':'middle'},String(timeline.meter.denominator))
    }
    const sigMidi={0:72,2:74,4:76,5:77,7:79,9:69,11:71}
    orderedSignatureEntries(e.key).forEach(([pc,mark],i)=>{
      const x=40+17*i
      const flatStaffMidi = {5:65,7:67};
      const signMidi = mark === '♭' && Object.hasOwn(flatStaffMidi,Number(pc))
        ? flatStaffMidi[Number(pc)]
        : (sigMidi[Number(pc)] ?? (60+Number(pc)));
      const pitchStep=step(signMidi)
      if(isPersianAccidental(mark)){
        // Anchor the meaningful corner of each vector symbol to the
        // actual staff pitch: Koron's triangle tip (y=46 in artwork),
        // Sori's right-side vertex (y=98). The text baseline offset is
        // for the original flat/sharp glyphs only.
        const pitchY=104-pitchStep*4.5
        const glyphTop=mark==='کرن'?6.5:13.4
        appendPersianAccidental(svg,mark,{
          x:x-9,y:pitchY-glyphTop,width:16,height:22
        })
      } else {
        // Keep the existing flat/sharp rendering and baseline untouched.
        const y=106-pitchStep*4.5
        draw('text',{x,y,'font-size':17,fill:'currentColor'},mark)
      }
    })
    const dots=(x,y,n)=>{
      for(let i=0;i<n;i++)draw('circle',{
        cx:x+14+6*i,cy:y,r:1.55,fill:'currentColor'
      })
    }
    const rest=ev=>{
      const x=ev.x,beats=ev.duration/second,s=symbol(beats)
      if(ev.wholeMeasure){
        // One centered standard full-measure rest represents any entirely
        // empty measure, including compound meters such as 6/8.
        draw('rect',{x:x-7,y:76,width:14,height:4,fill:'currentColor'})
        return
      }
      if(s.kind==='whole'||s.kind==='half')
        draw('rect',{x:x-7,y:s.kind==='whole'?76:82,
          width:14,height:4,fill:'currentColor'})
      else if(s.kind==='quarter')
        draw('path',{d:'M'+(x-2)+' 69 l6 8 -6 7 6 8 q-12 0 -7 11 q-8 -8 0 -12 l-4 -7 5 -8 -5 -6',
          fill:'none',stroke:'currentColor','stroke-width':2.25,
          'stroke-linejoin':'round','stroke-linecap':'round'})
      else {
        const n=s.kind==='eighth'?1:s.kind==='sixteenth'?2:3
        line(x+3,70,x-5,103,{'stroke-width':2})
        for(let i=0;i<n;i++){
          const y=73+i*8
          draw('circle',{cx:x+3,cy:y,r:3,fill:'currentColor'})
          draw('path',{d:'M'+(x+3)+' '+y+' Q'+(x+14)+' '+(y-1)+' '+(x+5)+' '+(y+10),
            fill:'none',stroke:'currentColor','stroke-width':2.2})
        }
      }
      dots(x,89,s.dots)
    }
    const note=({note:n,index},x,onset=n.at)=>{
      const visual=Number.isInteger(n.staffM)?n.staffM:n.m
      const y=104-step(visual)*4.5
      for(let l=113;l<=y;l+=9)line(x-9,l,x+9,l)
      for(let l=59;l>=y;l-=9)line(x-9,l,x+9,l)
      const beats=n.d/second,s=symbol(beats)
      const hollow=s.kind==='whole'||s.kind==='half'
      const head=draw('ellipse',{cx:x,cy:y,
        rx:s.kind==='whole'?7.5:5.8,ry:s.kind==='whole'?4.5:3.9,
        transform:'rotate(-20 '+x+' '+y+')',
        fill:hollow?'none':'currentColor',stroke:'currentColor',
        'stroke-width':hollow?1.8:1.1,'data-note-type':s.kind})
      if(s.kind!=='whole'){
        const up=y>=86,stemX=x+(up?5.8:-5.8),end=y+(up?-31:31)
        line(stemX,y,stemX,end,{'stroke-width':1.6})
        const flags=s.kind==='eighth'?1:s.kind==='sixteenth'?2:s.kind==='thirty-second'?3:0
        for(let i=0;i<flags;i++){
          const yy=end+(up?8*i:-8*i)
          const path=up
            ? 'M'+stemX+' '+yy+' Q'+(stemX+20)+' '+(yy+3)+' '+(stemX+9)+' '+(yy+20)
            : 'M'+stemX+' '+yy+' Q'+(stemX-20)+' '+(yy-3)+' '+(stemX-9)+' '+(yy-20)
          draw('path',{d:path,fill:'none',stroke:'currentColor',
            'stroke-width':2.1,'stroke-linecap':'round'})
        }
      }
      const onLine=Math.abs((y-104)/9-Math.round((y-104)/9))<.02
      dots(x,onLine?y-4.5:y,s.dots)
      const accidental=n.staffAccidental||
        ([1,3,6,8,10].includes(n.m%12)?'♯':'')
      if(isPersianAccidental(accidental)){
        // Explicit note accidentals must target this note's Y as well.
        const glyphTop=accidental==='کرن'?6.5:13.4
        appendPersianAccidental(svg,accidental,{
          x:x-24,y:y-glyphTop,width:16,height:22
        })
      }else if(accidental){
        draw('text',{x:x-17,y:y+4,'font-size':16,fill:'currentColor'},accidental)
      }
      if(selected.has(index))head.setAttribute('stroke-width',3)
      // Small arrow near (not around) the note. Keep the original index for
      // playback highlighting across sorted and wrapped score rows.
      const indicatorX = x + (y >= 86 ? -12 : 12);
      draw('path',{
        d:'M'+indicatorX+' '+(y-25)+' V'+(y-14)+
          ' m-4 -4 4 4 4-4',
        fill:'none',stroke:'var(--accent)','stroke-width':2,
        'stroke-linecap':'round','stroke-linejoin':'round',opacity:0,
        'pointer-events':'none','data-playback-note':index,
        'data-playback-from':onset,'data-playback-to':onset+n.d
      })
      const hit=draw('circle',{cx:x,cy:y,r:10,fill:'transparent',
        'data-score-note':index})
      let pointer=null,ignoreClick=false
      if(tool==='select'&&move){
        hit.style.touchAction='none'
        hit.style.cursor='grab'
        hit.onpointerdown=ev=>{
          if(ev.button!==undefined&&ev.button!==0)return
          if(ev.isPrimary===false)return
          ignoreClick=false
          pointer={id:ev.pointerId,startX:ev.clientX,startY:ev.clientY,
            dragged:false}
          hit.setPointerCapture?.(ev.pointerId)
          ev.stopPropagation()
        }
        hit.onpointermove=ev=>{
          if(!pointer||ev.pointerId!==pointer.id)return
          if(!pointer.dragged &&
             Math.hypot(ev.clientX-pointer.startX,ev.clientY-pointer.startY)<5)return
          pointer.dragged=true
          hit.style.cursor='grabbing'
          showDragPreview(dragDestination(ev,e.notes[index]))
          ev.preventDefault?.()
        }
        hit.onpointerup=ev=>{
          if(!pointer||ev.pointerId!==pointer.id)return
          const dragged=pointer.dragged
          pointer=null
          ignoreClick=true
          if(hit.hasPointerCapture?.(ev.pointerId))
            hit.releasePointerCapture(ev.pointerId)
          hit.style.cursor='grab'
          if(dragged){
            const target=dragDestination(ev,e.notes[index])
            showDragPreview(null)
            if(target)move(index,{m:target.m,at:target.at})
          }else pick?.(index,ev.shiftKey||ev.ctrlKey||ev.metaKey)
          ev.stopPropagation()
        }
        hit.onpointercancel=ev=>{
          if(pointer?.id!==ev.pointerId)return
          pointer=null
          ignoreClick=true
          hit.style.cursor='grab'
          showDragPreview(null)
          ev.stopPropagation()
        }
        hit.onlostpointercapture=()=>{
          if(!pointer)return
          pointer=null
          hit.style.cursor='grab'
          showDragPreview(null)
        }
      }
      hit.onclick=ev=>{
        // Pen clicks must reach the shared chord/sequence planner.
        if(tool==='pen')return
        ev.stopPropagation()
        if(ignoreClick){ignoreClick=false;return}
        pick?.(index,ev.shiftKey||ev.ctrlKey||ev.metaKey)
      }
    }
    for(const ev of row.items){
      if(ev.type==='rest')rest(ev)
      else if(ev.type==='notes')ev.entries.forEach(entry=>note(entry,ev.x,ev.at))
      else if(ev.type==='barline'){
        line(ev.x,68,ev.x,104,{'stroke-width':1.4,
          'data-measure-end':String(ev.barIndex+1)})
      }
    }
    if(measured){
      // Join split note durations, including ties across barlines. The
      // canonical note's sounding time remains continuous and unchanged.
      for(const ev of row.items.filter(x=>x.type==='notes')){
        for(const entry of ev.entries.filter(x=>x.tieTo)){
          const pitch=Number.isInteger(entry.note.staffM)
            ?entry.note.staffM:entry.note.m
          const y=104-step(pitch)*4.5+8
          const next=row.items.filter(x=>x.type==='notes'&&x.at>ev.at)
            .find(x=>x.entries.some(p=>p.index===entry.index&&p.tieFrom))
          const end=next?next.x-6:Math.min(w-12,ev.x+24)
          draw('path',{
            d:'M'+(ev.x+6)+' '+y+' Q'+((ev.x+end)/2)+' '+(y+9)+
              ' '+end+' '+y,
            stroke:'currentColor','stroke-width':1.2,fill:'none',
            'data-tie-note':entry.index
          })
        }
      }
    }
    if(tool==='select'&&move){
      // A passive ghost shows the snapped pitch/position during dragging.
      // It is separate from the original notehead and never captures input.
      const group=document.createElementNS(ns,'g')
      group.setAttribute('pointer-events','none')
      group.setAttribute('aria-hidden','true')
      group.setAttribute('display','none')
      svg.append(group)
      const markerElement=(tag,attrs)=>{
        const node=document.createElementNS(ns,tag)
        for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value)
        group.append(node)
        return node
      }
      const guide=markerElement('line',{
        y1:26,y2:153,stroke:'var(--accent)','stroke-width':1,
        'stroke-dasharray':'3 4','stroke-opacity':.45
      })
      const ledger=Array.from({length:10},()=>markerElement('line',{
        stroke:'var(--accent)','stroke-opacity':.65,'stroke-width':1.1
      }))
      const head=markerElement('ellipse',{
        rx:6.8,ry:4.8,fill:'var(--accent)','fill-opacity':.25,
        stroke:'var(--accent)','stroke-opacity':.8,'stroke-width':1.3
      })
      dragMarkers[rowIndex]={group,guide,ledger,head}
    }
    if(tool==='pen'){
      // A ghost note communicates BOTH the exact snapped pitch and which
      // temporal insertion zone will be used when the user clicks.
      const ghost=document.createElementNS(ns,'g')
      ghost.setAttribute('pointer-events','none')
      ghost.setAttribute('aria-hidden','true')
      ghost.setAttribute('display','none')
      svg.append(ghost)
      const preview=(tag,attrs)=>{
        const element=document.createElementNS(ns,tag)
        for(const [key,value] of Object.entries(attrs))element.setAttribute(key,value)
        ghost.append(element)
        return element
      }
      const guide=preview('line',{
        stroke:'var(--accent)','stroke-width':1,'stroke-opacity':.34,
        'stroke-dasharray':'3 4'
      })
      const ledgers=[...Array(8)].map(()=>preview('line',{
        stroke:'var(--accent)','stroke-opacity':.55,'stroke-width':1.1
      }))
      const head=preview('ellipse',{
        rx:6.8,ry:4.8,fill:'var(--accent)','fill-opacity':.26,
        stroke:'var(--accent)','stroke-opacity':.66,'stroke-width':1.2
      })
      const hint=preview('text',{
        y:11,'font-size':10,'font-weight':600,
        fill:'var(--accent)','fill-opacity':.86,'text-anchor':'middle'
      })
      const hints=fa
        ? {chord:'هم‌زمان',before:'قبل از نت',between:'بین نت‌ها',after:'بعد از نت',rest:'سکوت'}
        : {chord:'Chord',before:'Before',between:'Between',after:'After',rest:'Rest'}
      function showGhost(ev) {
        const rect=svg.getBoundingClientRect()
        const x=ev.clientX-rect.left,y=ev.clientY-rect.top
        if(x<4||x>w-4||y<4||y>161){
          ghost.setAttribute('display','none')
          return
        }
        const placement=planPlacement(rowIndex,x,ev.shiftKey)
        const midi=pitchFromY(y),noteY=104-step(midi)*4.5
        const anchor=Math.max(margin-12,Math.min(w-15,placement.x))
        guide.setAttribute('x1',anchor)
        guide.setAttribute('x2',anchor)
        guide.setAttribute('y1',22)
        guide.setAttribute('y2',153)
        guide.setAttribute('stroke-opacity',placement.kind==='chord'?.12:.34)
        head.setAttribute('cx',anchor)
        head.setAttribute('cy',noteY)
        head.setAttribute('transform','rotate(-20 '+anchor+' '+noteY+')')
        const positions=[]
        for(let l=113;l<=noteY;l+=9)positions.push(l)
        for(let l=59;l>=noteY;l-=9)positions.push(l)
        ledgers.forEach((line,i)=>{
          const active=i<positions.length
          line.setAttribute('display',active?'inline':'none')
          if(active){
            line.setAttribute('x1',anchor-10)
            line.setAttribute('x2',anchor+10)
            line.setAttribute('y1',positions[i])
            line.setAttribute('y2',positions[i])
          }
        })
        hint.textContent=hints[placement.kind]
        hint.setAttribute('x',Math.max(43,Math.min(w-43,anchor)))
        ghost.setAttribute('display','inline')
      }
      svg.onpointermove=showGhost
      svg.onpointerleave=()=>ghost.setAttribute('display','none')
    }
    svg.onclick=ev=>{
      if(tool!=='pen')return
      const rect=svg.getBoundingClientRect()
      const x=ev.clientX-rect.left,y=ev.clientY-rect.top
      if(y<4||y>161)return
      const placement=planPlacement(rowIndex,x,ev.shiftKey)
      insert?.(pitchFromY(y),placement)
    }
  }
}
