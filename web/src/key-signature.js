// Shared key/tuning model: do not duplicate or shadow e.key/e.offset.
const ns='http://www.w3.org/2000/svg'
const steps=[0,0,1,1,2,3,3,4,4,5,5,6]
const step=m=>Math.floor(m/12)*7+steps[m%12]-37
export const SIGNATURE_PITCHES=[
  {name:'C',pc:0,midi:72},
  {name:'D',pc:2,midi:74},
  {name:'E',pc:4,midi:76},
  {name:'F',pc:5,midi:77},
  {name:'G',pc:7,midi:79},
  {name:'A',pc:9,midi:69},
  {name:'B',pc:11,midi:71}
]
export const SIGNATURE_MARKS=[
  {mark:'',glyph:'♮',en:'Natural',fa:'طبیعی'},
  {mark:'♭',glyph:'♭',en:'Flat',fa:'بمل'},
  {mark:'♯',glyph:'♯',en:'Sharp',fa:'دیز'},
  {mark:'کرن',glyph:'𝇪',en:'Koron',fa:'کرن'},
  {mark:'سری',glyph:'𝇫',en:'Sori',fa:'سری'}
]
export const signatureGlyph=mark=>SIGNATURE_MARKS.find(item=>item.mark===mark)?.glyph||mark

export function drawKeySignatureEditor(host,e,{selectedPc=0,onSelect}={}){
  host.replaceChildren()
  const w=Math.max(650,host.clientWidth||650)
  const svg=document.createElementNS(ns,'svg')
  svg.setAttribute('width',w)
  svg.setAttribute('height',160)
  svg.setAttribute('viewBox','0 0 '+w+' 160')
  svg.setAttribute('role','group')
  svg.setAttribute('aria-label','Key signature staff')
  host.append(svg)
  const draw=(tag,attrs,content)=>{
    const element=document.createElementNS(ns,tag)
    for(const [k,v] of Object.entries(attrs))element.setAttribute(k,v)
    if(content!==undefined)element.textContent=content
    svg.append(element)
    return element
  }
  const pos=index=>96+index*(w-174)/6
  const yFor=midi=>104-step(midi)*4.5
  const selectedIndex=SIGNATURE_PITCHES.findIndex(p=>p.pc===selectedPc)
  if(selectedIndex>=0)draw('rect',{
    x:pos(selectedIndex)-25,y:41,width:50,height:104,rx:8,
    fill:'var(--accent)',opacity:.09,'pointer-events':'none'
  })
  for(let i=0;i<5;i++){
    const y=104-i*9
    draw('line',{x1:8,y1:y,x2:w-8,y2:y,stroke:'currentColor','stroke-width':1})
  }
  draw('text',{x:12,y:103,'font-size':46,fill:'currentColor'},'𝄞')
  SIGNATURE_PITCHES.forEach((pitch,i)=>{
    const x=pos(i),y=yFor(pitch.midi)
    const mark=e.key[pitch.pc]||''
    // Unmarked staff positions must remain entirely blank; the existing
    // transparent click targets still allow selecting an empty pitch.
    if(mark||e.offset[pitch.pc]){
      draw('text',{
        x,y:y+7,'font-size':27,
        'text-anchor':'middle',fill:'currentColor',
        'font-family':mark==='کرن'||mark==='سری'
          ? '"Noto Music","Bravura","Segoe UI Symbol",serif':'inherit',
        'pointer-events':'none'
      },mark?signatureGlyph(mark):'♮')
    }
    draw('text',{
      x,y:143,'font-size':12,
      'font-weight':pitch.pc===selectedPc?700:400,
      fill:pitch.pc===selectedPc?'var(--accent)':'currentColor',
      'text-anchor':'middle','pointer-events':'none'
    },pitch.name)
    const target=draw('rect',{
      x:x-25,y:42,width:50,height:106,
      fill:'transparent',cursor:'pointer',role:'button',tabindex:0,
      'aria-label':pitch.name+' key signature',
      'aria-pressed':String(pitch.pc===selectedPc),
      'data-key-pitch':pitch.pc
    })
    target.onclick=()=>onSelect?.(pitch.pc)
    target.onkeydown=ev=>{
      if(ev.key==='Enter'||ev.key===' '){
        ev.preventDefault()
        onSelect?.(pitch.pc)
      }
    }
  })
  return svg
}
