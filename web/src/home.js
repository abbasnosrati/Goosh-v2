// Presentation-only home layouts. Music, routing, storage and practice logic remain in app.js.
const glyphs = {
  sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 17 .8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  music: '<path d="M9 18V5l12-2v13"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/>',
  waveform: '<path d="M2 12h2m2-5v10m4-14v18m4-12v6m4-10v14m4-7h2"/>',
  import: '<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 17v4h16v-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  flame: '<path d="M12 22c-5 0-8-3.5-8-8 0-3 1.5-5.5 4-8 .4 3 2 4.5 3 5 0-3 1.5-6 4-9 0 4 5 6.5 5 12 0 4.5-3 8-8 8Z"/>',
  headphones: '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="13" width="5" height="8" rx="2"/><rect x="17" y="13" width="5" height="8" rx="2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  book: '<path d="M4 5.5C7 4 10 4 12 6c2-2 5-2 8-.5V20c-3-1.5-6-1.5-8 .5-2-2-5-2-8-.5V5.5Z"/><path d="M12 6v14.5"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  share: '<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5m-8 7 8 5"/>',
  pen: '<path d="m4 20 4-.8L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/><path d="m14 7 3 3"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>'
};
function icon(parent, name, cls='') {
  const wrap=document.createElement('span');
  wrap.className='g-icon '+cls;
  wrap.setAttribute('aria-hidden','true');
  wrap.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(glyphs[name]||glyphs.music)+'</svg>';
  parent.append(wrap);
  return wrap;
}
function noteArt(el, parent, mode='score') {
  const frame=el('div',parent,undefined,'g-note-art g-note-art-'+mode);
  frame.setAttribute('aria-hidden','true');
  const staff=el('div',frame,undefined,'g-staff');
  for(let i=0;i<5;i++)el('span',staff);
  const positions=[[9,65],[20,54],[32,65],[45,42],[57,51],[70,34],[82,48]];
  for(const [x,y] of positions){
    const n=el('i',frame,undefined,'g-note');
    n.style.left=x+'%';
    n.style.top=y+'%';
  }
  return frame;
}
function sectionHeading(el, parent, eyebrow, title, description) {
  const heading=el('div',parent,undefined,'g-section-heading');
  const copy=el('div',heading);
  el('span',copy,eyebrow,'g-eyebrow');
  el('h2',copy,title);
  if(description)el('p',copy,description);
  return heading;
}
function textAction(el, parent, text, glyph, onClick, variant='') {
  const button=el('button',parent,undefined,'g-action '+variant);
  button.type='button';
  icon(button,glyph);
  el('span',button,text);
  button.onclick=onClick;
  return button;
}
function infoChip(el,parent,label,glyph){
  const chip=el('span',parent,undefined,'g-chip');
  icon(chip,glyph);
  el('span',chip,label);
}
function navigateToEtude(id, mode){
  location.hash=mode+'/'+id;
}
function renderDesktop({el,app,t,collection,navigate}) {
  const page=el('div',app,undefined,'g-desktop');
  const hero=el('section',page,undefined,'g-hero');
  const copy=el('div',hero,undefined,'g-hero-copy');
  const eyebrow=el('div',copy,undefined,'g-overline');
  icon(eyebrow,'sparkles');
  el('span',eyebrow,t('WHAT YOU CAN DO HERE','کارهایی که می‌تونی اینجا انجام بدی'));
  el('h1',copy,t('Create etudes. Practice your way.','ساخت و تمرین اتود، به سبک خودت'));
  el('p',copy,t(
    'Play on the piano or write on the staff. Design etudes, save them and share them as files.',
    'با پیانو بنواز یا روی خط حامل نت بنویس؛ اتودت را طراحی، ذخیره و به‌صورت فایل با دیگران به اشتراک بگذار.'
  ),'g-hero-lead');
  const features=el('div',copy,undefined,'g-feature-chips');
  for(const [glyph,en,ir,featured] of [
    ['sparkles','Etudes for Iranian music','اتودسازی برای موسیقی ایرانی',true],
    ['waveform','Precise pitch tuning for chosen notes','تنظیم دقیق Pitch نت‌های دلخواه',true],
    ['pen','Create custom etudes','ساخت اتود دلخواه'],
    ['layers','Customize practice rules','تنظیم شیوه تمرین'],
    ['share','Share etude files','اشتراک‌گذاری اتود']
  ]){
    const chip=el('span',features,undefined,'g-feature-chip'+(featured?' g-feature-chip-featured':''));
    icon(chip,glyph);
    el('span',chip,t(en,ir));
  }
  const buttons=el('div',copy,undefined,'g-hero-buttons');
  textAction(el,buttons,t('Enter workspace','ورود به فضای کار'),'arrow',()=>{
    document.querySelector('#goosh-hub')?.scrollIntoView({behavior:'smooth',block:'start'});
  },'g-action-primary');
  const meta=el('div',copy,undefined,'g-downloads');
  const android=el('a',meta,undefined,'g-download-link');
  android.href='https://github.com/abbasnosrati/Goosh-v2/actions/workflows/android.yml';
  android.target='_blank';
  android.rel='noopener noreferrer';
  icon(android,'smartphone');
  el('span',android,t('Android APK builds','نسخه آزمایشی Android (APK)'));
  const ios=el('span',meta,undefined,'g-download-link g-download-unavailable');
  icon(ios,'smartphone');
  el('span',ios,t('iOS · Coming soon','iOS · به‌زودی'));
  const hint=el('p',copy,t(
    'No account required. Your work stays on your device.',
    'بدون نیاز به حساب کاربری؛ اتودها روی دستگاه خودت نگهداری می‌شوند.'
  ),'g-hero-footnote');
  const art=el('div',hero,undefined,'g-hero-composition');
  art.setAttribute('aria-hidden','true');
  const orbital=el('div',art,undefined,'g-orbit');
  icon(orbital,'music');
  const sheet=el('div',art,undefined,'g-sheet-mock');
  const sheetHeader=el('div',sheet,undefined,'g-sheet-header');
  el('span',sheetHeader,'GOOSH / STUDIO');
  const dots=el('div',sheetHeader,undefined,'g-window-dots');
  for(let i=0;i<3;i++)el('i',dots);
  el('strong',sheet,t('Your next melody starts here','ملودی بعدی از اینجا شروع می‌شود'));
  noteArt(el,sheet,'hero');
  const mockTools=el('div',sheet,undefined,'g-sheet-tools');
  for(const [glyph,label] of [['pen','WRITE'],['play','PLAY'],['waveform','LISTEN']]){
    const item=el('div',mockTools);
    icon(item,glyph);
    el('span',item,label);
  }
  const float=el('div',art,undefined,'g-float-card');
  icon(float,'headphones');
  const floatText=el('div',float);
  el('small',floatText,t('Learn by listening','یادگیری با شنیدن'));
  el('strong',floatText,'GOOSH');

  const hub=el('section',page,undefined,'g-hub');
  hub.id='goosh-hub';
  sectionHeading(el,hub,t('YOUR WORKSPACE','فضای کار شما'),t('Choose your space','از اینجا شروع کن'),t(
    'Two complementary spaces, one uninterrupted musical workflow.',
    'دو فضای مکمل برای ساختن و تمرین، در یک تجربه منسجم.'
  ));
  const cards=el('div',hub,undefined,'g-hub-grid');
  for(const item of [
    {key:'studio',glyph:'pen',name:t('Etudes','اتودها'),sub:t('Compose & share','ساخت و اشتراک‌گذاری'),desc:'',cta:t('Open Etudes','ورود به اتودها')},
    {key:'practice',glyph:'headphones',name:t('Practice','تمرین‌ها'),sub:t('Practice etudes','تمرین اتودها'),desc:'',cta:t('Open Practice','ورود به تمرین')}
  ]){
    const card=el('button',cards,undefined,'g-hub-card g-hub-'+item.key);
    card.type='button';
    card.onclick=()=>navigate(item.key);
    const cardTop=el('div',card,undefined,'g-hub-top');
    icon(cardTop,item.glyph);
    const content=el('div',card,undefined,'g-hub-content');
    el('span',content,item.sub,'g-hub-kicker');
    el('h3',content,item.name);
    if(item.desc)el('p',content,item.desc);
    const visual=el('div',card,undefined,'g-hub-visual');
    if(item.key==='studio')noteArt(el,visual,'card');
    else{
      const waveform=el('div',visual,undefined,'g-waveform');
      [25,44,30,68,90,56,33,75,100,54,28,66,40,22,47,31,15].forEach(h=>{
        const line=el('i',waveform);line.style.height=h+'%';
      });
    }
    const foot=el('div',card,undefined,'g-hub-foot');
    el('span',foot,item.key==='studio'
      ? t(collection.size+' local etudes',collection.size.toLocaleString('fa-IR')+' اتود ذخیره‌شده')
      : t('Practice on your terms','تمرین با ریتم خودت'));
    const link=el('span',foot,item.cta,'g-hub-enter');
    icon(link,'arrow');
  }

  return page;
}
function renderDashboard({el,app,t,collection,createEtude,importEtude}) {
  const dashboard=el('div',app,undefined,'g-dashboard');
  const welcome=el('section',dashboard,undefined,'g-dashboard-heading');
  const top=el('div',welcome,undefined,'g-dashboard-top');
  const headline=el('div',top);
  el('span',headline,t('YOUR MUSIC SPACE','فضای موسیقی تو'),'g-eyebrow');
  el('h1',headline,t('Ready to create?','آماده‌ای برای موسیقی؟'));
  el('p',headline,t('Everything you need to compose and practice, right here.','همه چیز برای ساختن و تمرین، همین‌جا کنار توست.'));
  const counter=el('div',top,undefined,'g-count');
  el('strong',counter,collection.size.toLocaleString(t('en-US','fa-IR')));
  el('span',counter,t('Saved etudes','اتود ذخیره‌شده'));

  const tabs=el('div',dashboard,undefined,'g-home-tabs');
  tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label',t('Workspace sections','بخش‌های فضای کار'));
  const tabButtons=[];
  for(const [key,label,glyph] of [['etudes','Etudes','book'],['practice','Practice','headphones']]){
    const tab=el('button',tabs,undefined,'g-home-tab');
    tab.type='button';tab.setAttribute('role','tab');
    tab.id='g-tab-'+key;tab.setAttribute('aria-controls','g-panel-'+key);
    icon(tab,glyph);el('span',tab,label);
    tabButtons.push([key,tab]);
  }
  const layout=el('div',dashboard,undefined,'g-dashboard-grid');
  const etudes=el('section',layout,undefined,'g-dashboard-panel g-dashboard-etudes');
  etudes.id='g-panel-etudes';etudes.setAttribute('role','tabpanel');etudes.setAttribute('aria-labelledby','g-tab-etudes');
  const etudeHead=el('div',etudes,undefined,'g-panel-heading');
  const etudeTitle=el('div',etudeHead);
  icon(etudeTitle,'book');
  el('h2',etudeTitle,'Etudes');
  el('p',etudes,t('Your ideas, all in one place.','ایده‌هایت، همه در یک جا.'),'g-panel-description');
  const createActions=el('div',etudes,undefined,'g-create-row');
  textAction(el,createActions,t('New etude','اتود جدید'),'plus',createEtude,'g-action-primary');
  textAction(el,createActions,t('Import','وارد کردن'),'import',importEtude,'g-action-muted');
  const listTitle=el('div',etudes,undefined,'g-list-title');
  el('h3',listTitle,t('My library','کتابخانه من'));
  el('span',listTitle,collection.size.toLocaleString(t('en-US','fa-IR')),'g-count-pill');
  const list=el('div',etudes,undefined,'g-etude-list');
  const entries=[...collection.entries()].reverse().slice(0,4);
  if(!entries.length){
    const empty=el('div',list,undefined,'g-empty-library');
    icon(empty,'music');
    el('strong',empty,t('Your first etude is one tap away','اولین اتودت فقط یک لمس فاصله دارد'));
    el('p',empty,t('Use New etude to begin composing.','برای شروع ساخت، اتود جدید را انتخاب کن.'));
  }
  for(const [id,entry] of entries){
    const item=el('button',list,undefined,'g-etude-row');
    item.type='button';item.onclick=()=>navigateToEtude(id,'studio');
    const symbol=el('span',item,undefined,'g-etude-symbol');icon(symbol,entry.origin==='imported'?'import':'music');
    const info=el('span',item,undefined,'g-etude-info');
    el('strong',info,entry.data.title||t('Untitled etude','اتود بدون نام'));
    el('small',info,(entry.data.notes?.length||0).toLocaleString(t('en-US','fa-IR'))+' '+t('notes','نت')+' · '+(entry.origin==='imported'?t('Imported','واردشده'):t('My etude','اتود من')));
    icon(item,'arrow','g-row-arrow');
  }
  if(collection.size>4){
    textAction(el,etudes,t('View all etudes','نمایش همه اتودها'),'arrow',()=>{location.hash='studio'},'g-action-text');
  }
  const feed=el('div',etudes,undefined,'g-community-mini');
  const feedTitle=el('div',feed,undefined,'g-mini-title');
  icon(feedTitle,'share');
  el('h3',feedTitle,t('Shared etudes','اتودهای به‌اشتراک‌گذاشته‌شده'));
  el('span',feed,t('Community feed coming soon','فید کاربران به‌زودی فعال می‌شود'),'g-muted-info');

  const practice=el('section',layout,undefined,'g-dashboard-panel g-dashboard-practice');
  practice.id='g-panel-practice';practice.setAttribute('role','tabpanel');practice.setAttribute('aria-labelledby','g-tab-practice');
  const practiceHead=el('div',practice,undefined,'g-panel-heading');
  const practiceTitle=el('div',practiceHead);
  icon(practiceTitle,'headphones');
  el('h2',practiceTitle,'Practice');
  el('p',practice,t('Make space for a little progress today.','امروز هم جایی برای یک قدم پیشرفت باز کن.'),'g-panel-description');
  const daily=el('div',practice,undefined,'g-daily-card');
  const dailyEyebrow=el('div',daily,undefined,'g-daily-eyebrow');
  icon(dailyEyebrow,'sparkles');
  el('span',dailyEyebrow,t('TODAY’S PRACTICE','تمرین امروز'));
  el('h3',daily,t('One etude at a time','هر بار یک اتود'));
  el('p',daily,t('Open an etude and work through it note by note.','یک اتود را باز کن و نت‌به‌نت تمرینش کن.'));
  const first=entries[0];
  textAction(el,daily,t('Start practicing','شروع تمرین'),'play',()=>{
    location.hash=first?'practice/'+first[0]:'practice';
  },'g-action-primary');
  const practiceListTitle=el('div',practice,undefined,'g-list-title');
  el('h3',practiceListTitle,t('Ready to practice','آماده تمرین'));
  if(!entries.length)el('span',practice,t('Import or create an etude to begin.','برای شروع، یک اتود بساز یا وارد کن.'),'g-muted-info');
  for(const [id,entry] of entries.slice(0,2)){
    const item=el('button',practice,undefined,'g-practice-link');
    item.type='button';item.onclick=()=>navigateToEtude(id,'practice');
    icon(item,'play');
    el('span',item,entry.data.title||t('Untitled etude','اتود بدون نام'));
    icon(item,'arrow','g-row-arrow');
  }
  const utilities=el('div',practice,undefined,'g-tools-grid');
  for(const [glyph,name,sub] of [
    ['clock',t('Practice timer','تایمر تمرین'),t('Coming soon','به‌زودی')],
    ['flame',t('Warm-ups','گرم‌کردن دست'),t('Coming soon','به‌زودی')]
  ]){
    const tile=el('div',utilities,undefined,'g-tool-tile');
    icon(tile,glyph);
    el('strong',tile,name);
    el('small',tile,sub);
  }
  function setTab(active){
    for(const [key,button] of tabButtons){
      const selected=key===active;
      button.classList.toggle('is-selected',selected);
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
    }
    etudes.classList.toggle('is-selected',active==='etudes');
    practice.classList.toggle('is-selected',active==='practice');
  }
  for(const [key,button] of tabButtons)button.onclick=()=>setTab(key);
  setTab('etudes');
  return dashboard;
}
export function renderHome(context) {
  renderDesktop(context);
  renderDashboard(context);
}
