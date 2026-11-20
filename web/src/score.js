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
export function score(host,e,{zoom=1,wrap=true,selected=new Set(),pick,insert}={}) {
  host.replaceChildren()
  const second=60/(e.bpm||90),width=Math.max(240,host.clientWidth||700)
  const margin=64+Object.keys(e.key).length*17
  const ordered=e.notes.map((note,index)=>({note,index})).sort((a,b)=>
    a.note.at-b.note.at||a.index-b.index)
  const groups=[]
  for(const item of ordered){
    const g=groups[groups.length-1]
    if(g&&Math.abs(g.at-item.note.at)<1e-7){
      g.entries.push(item);g.duration=Math.max(g.duration,item.note.d)
    }else groups.push({type:'notes',at:item.note.at,duration:item.note.d,entries:[item]})
  }
  const events=[]
  let soundingUntil=0
  for(const g of groups){
    if(g.at-soundingUntil>second*.025)
      events.push({type:'rest',at:soundingUntil,duration:g.at-soundingUntil})
    events.push(g)
    soundingUntil=Math.max(soundingUntil,g.at+g.duration)
  }
  if(!events.length)events.push({type:'empty',at:0,duration:second})
  const rows=[]
  let items=[],cursor=margin+16
  for(const ev of events){
    const beats=Math.max(.125,ev.duration/second)
    const span=Math.max(26,Math.min(100,36*zoom*(.85+.48*Math.sqrt(Math.min(16,beats)))))
    if(wrap&&items.length&&cursor+span>width-10){
      rows.push({items,extent:cursor});items=[];cursor=margin+16
    }
    ev.x=cursor;ev.span=span;items.push(ev);cursor+=span
  }
  rows.push({items,extent:cursor})
  for(const row of rows){
    const svg=document.createElementNS(ns,'svg')
    const w=wrap?width:Math.max(width,row.extent+16)
    svg.setAttribute('width',w);svg.setAttribute('height',165);host.append(svg)
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
    draw('text',{x:7,y:103,'font-size':46,fill:'currentColor'},'𝄞')
    const sigMidi={0:72,2:74,4:76,5:77,7:79,9:69,11:71}
    const glyphs={'کرن':'𝇪','سری':'𝇫','♭':'♭','♯':'♯'}
    Object.entries(e.key).forEach(([pc,mark],i)=>draw('text',{
      x:40+17*i,
      y:106-step(sigMidi[Number(pc)]??(60+Number(pc)))*4.5,
      'font-size':mark==='کرن'||mark==='سری'?19:17,
      'font-family':mark==='کرن'||mark==='سری'
        ? '"Noto Music","Bravura","Segoe UI Symbol",serif':'inherit',
      fill:'currentColor'
    },glyphs[mark]||mark))
    const dots=(x,y,n)=>{
      for(let i=0;i<n;i++)draw('circle',{
        cx:x+14+6*i,cy:y,r:1.55,fill:'currentColor'
      })
    }
    const rest=ev=>{
      const x=ev.x,beats=ev.duration/second,s=symbol(beats)
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
    const note=({note:n,index},x)=>{
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
      const koron=n.staffAccidental==='کرن'
      const accidental=koron?'𝇪':(n.staffAccidental||
        ([1,3,6,8,10].includes(n.m%12)?'♯':''))
      if(accidental)draw('text',{x:x-17,y:y+4,'font-size':koron?19:16,
        'font-family':koron?'"Noto Music", "Bravura", "Segoe UI Symbol", serif':'inherit',
        fill:'currentColor'},accidental)
      if(selected.has(index))head.setAttribute('stroke-width',3)
      // Small arrow near (not around) the note. Keep the original index for
      // playback highlighting across sorted and wrapped score rows.
      const indicatorX = x + (y >= 86 ? -12 : 12);
      draw('path',{
        d:'M'+indicatorX+' '+(y-25)+' V'+(y-14)+
          ' m-4 -4 4 4 4-4',
        fill:'none',stroke:'var(--accent)','stroke-width':2,
        'stroke-linecap':'round','stroke-linejoin':'round',opacity:0,
        'pointer-events':'none','data-playback-note':index
      })
      draw('circle',{cx:x,cy:y,r:10,fill:'transparent'}).onclick=ev=>{
        ev.stopPropagation();pick?.(index,ev.shiftKey||ev.ctrlKey||ev.metaKey)
      }
    }
    for(const ev of row.items){
      if(ev.type==='rest')rest(ev)
      else if(ev.type==='notes')ev.entries.forEach(entry=>note(entry,ev.x))
    }
    svg.onclick=ev=>{
      const box=svg.getBoundingClientRect()
      const s=Math.round((104-(ev.clientY-box.top))/4.5)
      let midi=60
      while(midi<108&&step(midi)<s)midi++
      while(midi>24&&step(midi)>s)midi--
      const x=ev.clientX-box.left
      const near=row.items.reduce((a,b)=>Math.abs(a.x-x)<=Math.abs(b.x-x)?a:b)
      const last=row.items[row.items.length-1]
      const final=e.notes.reduce((t,n)=>Math.max(t,n.at+n.d),0)
      insert?.(midi,x>last.x+last.span*.55?final:near.at)
    }
  }
}
