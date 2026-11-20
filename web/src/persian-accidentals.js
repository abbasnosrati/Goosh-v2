// Shared, font-independent vector artwork for Persian Koron and Sori.
// Paths are redrawn from the two user-provided reference images.
// These are display-only: stored e.key and e.offset remain unchanged.
const NS = 'http://www.w3.org/2000/svg'

export const isPersianAccidental = mark => mark === 'کرن' || mark === 'سری'

// Both use the same normalized coordinate space, so all usages share
// geometry and stroke proportions regardless of browser fonts.
const STROKES = {
  'کرن': [
    {d:'M30 8 V152',width:8.5},
    {d:'M30 9 L100 46 L30 83 Z',width:8.5}
  ],
  'سری': [
    {d:'M36 8 V153 M73 3 V149',width:11},
    {d:'M7 46 L113 98 L7 135',width:11}
  ]
}

// Append a real SVG element, usable in an HTML button or within staff SVG.
// x/y are optional for button use; when supplied they position an SVG on staff.
export function appendPersianAccidental(parent, mark, {
  x=null, y=null, height=32, width=24
}={}) {
  if(!isPersianAccidental(mark))return null
  const svg=document.createElementNS(NS,'svg')
  svg.setAttribute('viewBox','0 0 120 160')
  svg.setAttribute('width',width)
  svg.setAttribute('height',height)
  svg.setAttribute('preserveAspectRatio','xMidYMid meet')
  svg.setAttribute('aria-hidden','true')
  svg.setAttribute('focusable','false')
  svg.setAttribute('data-persian-accidental',mark)
  svg.setAttribute('pointer-events','none')
  svg.setAttribute('fill','none')
  if(x!==null)svg.setAttribute('x',x)
  if(y!==null)svg.setAttribute('y',y)
  for(const segment of STROKES[mark]){
    const path=document.createElementNS(NS,'path')
    path.setAttribute('d',segment.d)
    path.setAttribute('stroke','currentColor')
    path.setAttribute('stroke-width',segment.width)
    path.setAttribute('stroke-linecap','square')
    path.setAttribute('stroke-linejoin','miter')
    path.setAttribute('fill','none')
    svg.append(path)
  }
  parent.append(svg)
  return svg
}
