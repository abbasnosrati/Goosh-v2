import { loadPracticeCatalog } from './studio-practice.js?v=practice-flow-2';
import { loadMusicSystems } from './music-catalog.js';
import { signatureForMusic } from './music-signature.js';
import { newPracticeStep, localized } from './practice-model.js';
import { METER_PRESETS } from './model.js';
import { generateStudioEtude } from './ai-etude.js?v=ai-meter-measure-choice-1';
import { confirmStudioAction, showStudioMessage } from './studio-dialog.js';


/* Desktop Etude Setup visual icons. Shapes are constant decorative SVGs. */
const setupIconPaths = Object.freeze({
  music: ['M9 18V5l12-2v13', 'M9 18c0 1.7-1.8 3-4 3s-4-1.3-4-3 1.8-3 4-3 4 1.3 4 3Z', 'M21 16c0 1.7-1.8 3-4 3s-4-1.3-4-3 1.8-3 4-3 4 1.3 4 3Z'],
  layers: ['m12 3 9 5-9 5-9-5 9-5Z', 'm3 12 9 5 9-5', 'm3 16 9 5 9-5'],
  dastgah: ['M14 8 20 2', 'm17 2 5 5', 'M14 8c-1.4 2.1-3.8 2.5-5.7 4.4-2.9 2.9-3.4 6.8-1.2 8.1 2.6 1.4 6.4-1.6 7.6-4.2 1.3-2.7.7-5.1-.7-8.3Z', 'M10 16h.01', 'M16 5l3 3'],
  target: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z', 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z'],
  metronome: ['M9 3h6l5 18H4L9 3Z', 'M12 4 16 16', 'M8 18h8', 'M7 21h10'],
  wand: ['m4 20 11-11', 'm12 4 .6-2 .6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6Z', 'm19 12 .6-2 .6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6Z', 'm5 5 .5-1.5L6 5l1.5.5L6 6l-.5 1.5L5 6l-1.5-.5L5 5Z']
});
function appendSetupIcon(parent, kind, className='studio-setup-icon') {
  const wrapper=create('span',parent,null,className);
  wrapper.setAttribute('aria-hidden','true');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.7');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  for (const d of setupIconPaths[kind]) {
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',d);
    svg.append(path);
  }
  wrapper.append(svg);
  return wrapper;
}

// The score remains canonical; composerMode and pending user selection are only
// presentation state, never copies of musical data.
const states = new WeakMap();
const create = (tag, parent, text, className) => {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
};

// Western mode names are musical terms and stay in English in both UI
// languages. Only the tonic NOTE NAMES are localized for Persian readers;
// catalog IDs/spellings remain unchanged for tuning and generation.
const persianTonicNames = Object.freeze({
  C:'دو', D:'ر', E:'می', F:'فا', G:'سل', A:'لا', B:'سی'
});
export function tonicDisplayName(tonic, fa) {
  if (!fa) return tonic.label;
  return (tonic.spellings || [tonic.id]).map(spelling => {
    const match = /^([A-G])([#b]?)$/.exec(spelling);
    if (!match) return spelling;
    return persianTonicNames[match[1]] +
      (match[2]==='#' ? '♯' : match[2]==='b' ? '♭' : '');
  }).join(' / ');
}


// Shared Etude Setup picker. The original native select remains the single
// source of truth for all musical settings, generation and persistence.
let studioMusicPickerId=0;
function attachStudioSelectDialog(wrapper, select, heading, fa){
  const trigger=create('button',wrapper,null,'studio-mobile-select-trigger');
  trigger.type='button';
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-expanded','false');
  const valueLabel=create('span',trigger,'','studio-mobile-select-value');
  create('span',trigger,null,'studio-mobile-select-chevron').setAttribute('aria-hidden','true');
  const title=()=>heading.textContent.trim()||(fa?'انتخاب':'Choose');
  function sync(){
    const display=select.selectedOptions[0]?.textContent?.trim()||(fa?'انتخاب کنید…':'Choose…');
    valueLabel.textContent=display;
    trigger.title=display;
    trigger.setAttribute('aria-label',title()+': '+display);
    trigger.classList.toggle('is-placeholder',!select.value);
    trigger.disabled=select.disabled;
  }
  trigger.onclick=()=>{
    if(select.disabled||!select.isConnected)return;
    const dialog=create('dialog',wrapper,null,'studio-mobile-picker-dialog');
    const header=create('div',dialog,null,'studio-mobile-picker-header');
    const label=create('h2',header,title());
    label.id='studio-music-picker-'+(++studioMusicPickerId);
    dialog.setAttribute('aria-labelledby',label.id);
    const close=create('button',header,'×','studio-mobile-picker-close');
    close.setAttribute('aria-label',fa?'بستن فهرست انتخاب':'Close choices');
    close.type='button';
    close.onclick=()=>dialog.close();
    const choices=create('div',dialog,null,'studio-mobile-picker-options');
    let selectedButton=null;
    let previousGroup=null;
    for(const option of select.options){
      // Goal options have categories; preserve their headings in the shared
      // dialog without copying or changing the underlying select values.
      const group=option.parentElement?.tagName==='OPTGROUP'?option.parentElement:null;
      if(group!==previousGroup){
        if(group)create('div',choices,group.label,'studio-mobile-picker-group');
        previousGroup=group;
      }
      const button=create('button',choices,null,'studio-mobile-picker-option');
      button.type='button';
      button.disabled=option.disabled;
      const optionLabel=create('span',button,option.textContent.trim(),'studio-mobile-picker-option-label');
      optionLabel.dir='auto';
      create('span',button,'✓','studio-mobile-picker-check').setAttribute('aria-hidden','true');
      const selected=select.value===option.value;
      button.setAttribute('aria-pressed',String(selected));
      if(selected)selectedButton=button;
      button.onclick=()=>{
        if(select.value!==option.value){
          select.value=option.value;
          select.dispatchEvent(new Event('change',{bubbles:true}));
        }
        sync();
        dialog.close();
      };
    }
    dialog.addEventListener('close',()=>{
      trigger.setAttribute('aria-expanded','false');
      dialog.remove();
      if(trigger.isConnected)trigger.focus({preventScroll:true});
    },{once:true});
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
    trigger.setAttribute('aria-expanded','true');
    dialog.showModal();
    (selectedButton||choices.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
    selectedButton?.scrollIntoView({block:'nearest'});
  };
  sync();
  return {sync};
}


/* Phone-only onboarding moment when AI creation is selected.
   The whole modal is dismissible (including card and backdrop); it is
   information-only and never changes the composer or generation state. */
function showMobileAIGuide(fa){
  if(!window.matchMedia(
    '(max-width: 700px), (pointer: coarse) and (orientation: landscape) and (max-height: 520px)'
  ).matches)return;
  document.querySelector('dialog.studio-ai-guide-dialog[open]')?.close();
  const t=(en,ir)=>fa?ir:en;
  const dialog=create('dialog',document.body,null,'studio-ai-guide-dialog');
  const header=create('div',dialog,null,'studio-ai-guide-head');
  const symbol=create('span',header,'✦','studio-ai-guide-symbol');
  symbol.setAttribute('aria-hidden','true');
  const close=create('button',header,null,'studio-ai-guide-close');
  close.type='button';
  close.setAttribute('aria-label',t('Close guidance','بستن راهنما'));
  const closeIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');
  closeIcon.setAttribute('viewBox','0 0 24 24');
  closeIcon.setAttribute('width','18');
  closeIcon.setAttribute('height','18');
  closeIcon.setAttribute('fill','none');
  closeIcon.setAttribute('stroke','currentColor');
  closeIcon.setAttribute('stroke-width','1.85');
  closeIcon.setAttribute('stroke-linecap','round');
  closeIcon.setAttribute('aria-hidden','true');
  const closePaths=document.createElementNS('http://www.w3.org/2000/svg','path');
  closePaths.setAttribute('d','M18 6 6 18 M6 6l12 12');
  closeIcon.append(closePaths);
  close.append(closeIcon);
  close.onclick=()=>{if(dialog.open)dialog.close()};
  const eyebrow=create('p',dialog,t('AI COMPOSER','ساخت هوشمند'),'studio-ai-guide-eyebrow');
  eyebrow.setAttribute('aria-hidden','true');
  const heading=create('h2',dialog,t('Create with AI','ساخت اتود با هوش مصنوعی'),'studio-ai-guide-title');
  heading.id='studio-ai-guide-title';
  dialog.setAttribute('aria-labelledby',heading.id);
  const message=create('p',dialog,t(
    'In this section, set the practice goal and the required etude settings. Then tap Generate Etude to create your music.',
    'در همین بخش، هدف تمرین و تنظیمات لازم اتود را مشخص کنید؛ سپس دکمه «تولید اتود» را بزنید.'
  ),'studio-ai-guide-message');
  message.id='studio-ai-guide-message';
  dialog.setAttribute('aria-describedby',message.id);
  const steps=create('div',dialog,null,'studio-ai-guide-steps');
  create('span',steps,t('01 · Choose settings','۰۱ · تنظیمات و هدف تمرین'));
  create('span',steps,t('02 · Generate Etude','۰۲ · تولید اتود'));
  dialog.addEventListener('click',()=>{if(dialog.open)dialog.close()});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.showModal();
}

export function mountEtudeComposer(host, {
  etude, fa, isRecording, isCurrent, onGenerated, onModeChange, onSignatureChange,
  onToggleKeySignature, signatureIcon, onMeterSelect
}) {
  const t = (en, ir) => fa ? ir : en;
  let state = states.get(etude);
  if (!state) {
    const previous = etude.musicContext;
    const validPrevious = previous && ['iranian','western'].includes(previous.musicSystem);
    state = {
      mode:'manual', goal:'',
      musicSystem:validPrevious ? previous.musicSystem : 'iranian',
      styles:validPrevious
        ? {[previous.musicSystem]:previous.musicSystem === 'iranian' ? previous.dastgah : previous.scale}
        : {},
      tonic:previous?.tonic || 'C',
      controller:null, awaitingFirstAI:false,
      // An empty default-Free etude needs a deliberate choice for AI.
      meterConfirmed: Boolean(etude.notes?.length || etude.practiceSequence?.length ||
        (etude.meter && etude.meter !== 'none'))
    };
    states.set(etude,state);
  }
  // A full Studio rerender or route change invalidates in-flight generation.
  if (state.controller) {
    state.controller.abort();
    state.controller = null;
  }

  host.replaceChildren();
  host.className = 'studio-compose';
  // One content column keeps Music and AI settings tightly together regardless
  // of the Guide's height. It is layout-neutral on mobile.
  const mainColumn=create('div',host,null,'studio-setup-main');
  // Manual/AI and the musical choices share one settings surface.
  const sharedMusic = create('div', mainColumn, null, 'studio-compose-music');
  appendSetupIcon(sharedMusic,'music','studio-setup-hero-icon');
  create('h2', sharedMusic, t('Etude Setup', 'تنظیمات اتود'), 'studio-compose-heading');
  const tabs = create('div', sharedMusic, null, 'studio-compose-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', t('Etude creation method', 'روش ساخت اتود'));
  const manual = create('button', tabs, t('Manual', 'دستی'));
  const ai = create('button', tabs, t('AI', 'هوش مصنوعی'));
  manual.type = ai.type = 'button';
  manual.className = ai.className = 'studio-compose-tab';

  // A shared musical foundation: Manual and AI always use the same
  // canonical Etude key signature, piano and score playback frequencies.
  const content = create('div', mainColumn, null, 'studio-compose-ai');
  const intro = create('p', content, t(
    'Choose a learning goal before generating the notes. One score can then support multiple practices.',
    'قبل از تولید نت‌ها، هدف آموزشی را انتخاب کنید. سپس می‌توانید چند تمرین مختلف روی همان نت‌ها بسازید.'
  ), 'studio-compose-description');
  const musicSystem = create('fieldset', sharedMusic, null, 'studio-music-system');
  const musicLegend = create('legend', musicSystem, t('Musical system', 'سیستم موسیقایی'));
  const musicLegendIcon=appendSetupIcon(musicLegend,'layers');
  musicLegend.prepend(musicLegendIcon);
  const musicOptions = create('div', musicSystem, null, 'studio-music-choices');
  const radios = new Map();
  for (const [id, en, ir] of [
    ['iranian', 'Iranian Music', 'موسیقی ایرانی'],
    ['western', 'Western Music', 'موسیقی غربی']
  ]) {
    const label = create('label', musicOptions, null, 'studio-music-choice');
    const radio = create('input', label);
    radio.type = 'radio';
    radio.name = 'studio-music-system';
    radio.value = id;
    const name = create('span', label, t(en, ir));
    radios.set(id, {radio, name});
    radio.onchange = () => {
      if (!radio.checked || busy) return;
      state.musicSystem = id;
      fillStyleOptions();
      applySelectedSignature();
      showStudioMessage(status, '');
      sync();
      // Western music has an automatic signature, not the manual Iranian editor.
    };
  }
  const fields = create('div', sharedMusic, null, 'studio-compose-fields');
  // display:contents on Desktop preserves the original grid and labels.
  const styleField = create('div', fields, null, 'studio-select-field');
  const styleLabel = create('label', styleField, null, 'practice-field');
  appendSetupIcon(styleLabel,'dastgah');
  const styleHeading = create('span', styleLabel);
  const styleInput = create('select', styleLabel);
  styleInput.classList.add('studio-native-music-select');
  styleInput.onchange = () => {
    state.styles[state.musicSystem] = styleInput.value;
    applySelectedSignature();
    showStudioMessage(status, '');
    sync();
  };
  const stylePicker = attachStudioSelectDialog(styleField, styleInput, styleHeading, fa);
  const tonicField = create('div', fields, null, 'studio-select-field');
  const tonicLabel = create('label', tonicField, null, 'practice-field');
  const tonicHeading = create('span', tonicLabel, t('Tonic', 'تونیک'));
  const tonicInput = create('select', tonicLabel);
  tonicInput.classList.add('studio-native-music-select');
  tonicInput.onchange = () => {
    state.tonic = tonicInput.value;
    applySelectedSignature();
    tonicPicker.sync();
  };
  const tonicPicker = attachStudioSelectDialog(tonicField, tonicInput, tonicHeading, fa);
  tonicField.hidden = state.musicSystem !== 'western';
  const signatureHint = create('p', sharedMusic, null, 'studio-compose-music-hint');
  // Same signature action below Dastgah and same modal for all screen sizes.
  const signatureActions = create('div', fields, null, 'studio-signature-actions');
  const editSignature = create('button', signatureActions, null, 'signature-toggle studio-signature-entry');
  editSignature.type = 'button';
  const signatureLabel = t('Set Key Signature','تنظیم سرکلید');
  editSignature.setAttribute('aria-label', signatureLabel);
  const editIcon = signatureIcon?.();
  if (editIcon) {
    editIcon.classList.add('score-switch-symbol');
    editSignature.append(editIcon);
  }
  create('span', editSignature, signatureLabel, 'signature-toggle-label');
  editSignature.onclick = () => {
    if (!busy && state.musicSystem === 'iranian')
      onToggleKeySignature?.();
  };
  // Primary Practice Goal and Generate are AI-only, unlike the music selector.
  const goalLabel = create('div', content, null, 'practice-field studio-compose-goal');
  appendSetupIcon(goalLabel,'target');
  create('span', goalLabel, t('Primary practice goal', 'هدف اصلی تمرین'));
  const goalInput = create('select', goalLabel);
  const placeholder = create('option', goalInput, t('Select a goal…', 'انتخاب هدف تمرین…'));
  placeholder.value = '';
  goalInput.classList.add('studio-native-music-select');
  const goalHeading=goalLabel.querySelector('span:not(.studio-setup-icon)');
  const goalPicker=attachStudioSelectDialog(goalLabel, goalInput, goalHeading, fa);

  // Shared AI mirror of the canonical Score time-signature selector.
  const meterField = create('div', content, null,
    'studio-select-field studio-compose-mobile-meter');
  appendSetupIcon(meterField,'metronome');
  const meterLabel = create('label', meterField, null, 'practice-field');
  const meterHeading = create('span', meterLabel, t('Time signature', 'میزان‌نما'));
  const meterInput = create('select', meterLabel);
  meterInput.classList.add('studio-native-music-select');
  const meterPlaceholder = create('option', meterInput,
    t('Select a time signature…', 'انتخاب میزان‌نما…'));
  meterPlaceholder.value = '';
  meterPlaceholder.disabled = true;
  for (const value of METER_PRESETS) {
    const option = create('option', meterInput,
      value === 'none' ? t('Free (no meter)', 'آزاد (بدون میزان)') : value);
    option.value = value;
  }
  create('span', meterField, t('Time signature', 'میزان‌نما'),
    'studio-ai-meter-title');
  meterInput.onchange = () => {
    if (!meterInput.value || busy) return;
    onMeterSelect?.(meterInput.value);
    sync();
  };
  const meterPicker = attachStudioSelectDialog(meterField, meterInput, meterHeading, fa);
  const meterHint = create('p', content, t(
    'Choose a time signature in Score before generating. Free is also valid.',
    'برای تولید اتود میزان‌نما را انتخاب کنید؛ حالت آزاد نیز مجاز است.'
  ), 'studio-ai-meter-hint');

  let musicCatalog = null;
  const currentSystem = () => musicCatalog?.systems.find(entry => entry.id === state.musicSystem);
  const selectedContext = () => state.musicSystem === 'iranian'
    ? {musicSystem:'iranian',dastgah:state.styles.iranian}
    : {musicSystem:'western',scale:state.styles.western,tonic:state.tonic};
  function applySelectedSignature() {
    if (!musicCatalog) return;
    // Switching to a system without a chosen Dastgah/Scale/Mode must not
    // leave the previous system's accidentals or cent offsets active.
    // Preserve the unselected system in musicContext so it survives reloads.
    if (!state.styles[state.musicSystem]) {
      onSignatureChange?.({key:{}}, selectedContext());
      return;
    }
    // A preset selection updates the canonical score and playback immediately.
    // Initial data load does NOT overwrite previously custom-edited signatures.
    const signature = signatureForMusic(musicCatalog, selectedContext());
    onSignatureChange?.(signature, selectedContext());
  }
  function fillStyleOptions() {
    const system = currentSystem();
    if (!system) return;
    styleHeading.textContent = localized(system.selector, fa);
    styleInput.replaceChildren();
    const empty = create('option',styleInput,
      state.musicSystem === 'iranian'
        ? t('Select a Dastgah…','انتخاب دستگاه…')
        : t('Select a scale or mode…','انتخاب گام یا مد…'));
    empty.value = '';
    for (const entry of system.styles) {
      const option = create('option', styleInput,
        state.musicSystem === 'western' ? entry.label.en : localized(entry.label, fa));
      option.value = entry.id;
    }
    if (!system.styles.some(entry => entry.id === state.styles[state.musicSystem]))
      state.styles[state.musicSystem] = '';
    styleInput.value = state.styles[state.musicSystem];
    tonicLabel.hidden = state.musicSystem !== 'western';
    tonicField.hidden = tonicLabel.hidden;
    stylePicker.sync();
  }

  const actions = create('div', content, null, 'studio-compose-actions');
  const generate = create('button', actions, null, 'primary studio-compose-generate');
  generate.type = 'button';
  appendSetupIcon(generate,'wand','studio-setup-generate-icon');
  const generateLabel=create('span',generate,null,'studio-setup-generate-label');
  const status = create('p', content, null, 'studio-compose-status');
  const note = create('p', content, t(
    'Adding a new practice below will never regenerate or replace these notes.',
    'افزودن تمرین جدید در بخش طراحی تمرین، نت‌های اتود را دوباره تولید یا جایگزین نمی‌کند.'
  ), 'studio-compose-footnote');

  // Desktop-only visual guide from the approved reference; the existing
  // music selector, tuner, goal, meter and Generate callbacks stay canonical.
  const guide=create('aside',host,null,'studio-setup-guide');
  guide.setAttribute('aria-label',t('Etude Setup Guide','راهنمای تنظیمات اتود'));
  const guideHead=create('div',guide,null,'studio-setup-guide-head');
  create('h3',guideHead,t('Etude Setup Guide','راهنمای تنظیمات اتود'));
  const guideIntroduction=create('p',guideHead,t(
    'Configure the musical context and practice goal to generate a tailored etude.',
    'سیستم موسیقی و هدف تمرین را مشخص کنید تا اتود متناسب با آن ساخته شود.'
  ));
  appendSetupIcon(guideHead,'music','studio-setup-guide-art');
  const guideSteps=create('div',guide,null,'studio-setup-guide-steps');
  function addGuideStep(icon,title,description){
    const step=create('div',guideSteps,null,'studio-setup-guide-step');
    appendSetupIcon(step,icon,'studio-setup-guide-step-icon');
    const copy=create('div',step,null,'studio-setup-guide-step-copy');
    create('strong',copy,title);
    create('p',copy,description);
    return copy;
  }
  // Keep one guide and one step renderer. Only its instructions change
  // between Manual and AI (and between Iranian and Western music).
  let guideVersion='';
  function syncGuide(){
    const version=state.mode+':'+state.musicSystem;
    if(guideVersion===version)return;
    guideVersion=version;
    const isManual=state.mode==='manual';
    guideIntroduction.textContent=isManual
      ? t('Choose a musical system, write or play your etude, then design exercises.',
          'سیستم موسیقی را انتخاب کنید، اتود را بنویسید یا با پیانو بنوازید و بعد تمرین بسازید.')
      : t('Configure the musical context and practice goal to generate a tailored etude.',
          'سیستم موسیقی و هدف تمرین را مشخص کنید تا اتود متناسب با آن ساخته شود.');
    guideSteps.replaceChildren();
    addGuideStep('layers',t('Musical system','سیستم موسیقایی'),isManual
      ? t('Choose Iranian or Western music.',
          'موسیقی ایرانی یا غربی را انتخاب کنید.')
      : t('Choose the musical tradition for your etude (Iranian or Western).',
          'موسیقی ایرانی یا غربی را برای اتود انتخاب کنید.')
    );
    addGuideStep('dastgah',state.musicSystem==='iranian'
      ? t('Dastgah & Key Signature','دستگاه و سرکلید')
      : t('Scale/Mode & Key Signature','گام یا مد و سرکلید'),
      state.musicSystem==='iranian'
        ? (isManual
          ? t('Choose a Dastgah and adjust its key signature.',
              'دستگاه و سرکلید آن را تنظیم کنید.')
          : t("Select a Dastgah, then fine-tune the score's key signature if needed.",
              'دستگاه را انتخاب کنید و در صورت نیاز سرکلید را دقیق‌تر تنظیم کنید.'))
        : (isManual
          ? t('Choose a scale/mode and tonic to set the key signature.',
              'گام یا مد و نت پایه را برای تعیین سرکلید انتخاب کنید.')
          : t('Select a scale or mode and a tonic to set the score key signature.',
              'با انتخاب گام یا مد و نت پایه، سرکلید خط حامل تنظیم می‌شود.'))
    );
    if(isManual){
      addGuideStep('music',t('Compose & Edit','نوشتن و ویرایش اتود'),t(
        'Write notes on the Score or play the piano, then edit them.',
        'روی خط حامل نت بنویسید یا با پیانو بنوازید و سپس ویرایش کنید.'
      ));
      addGuideStep('target',t('Design Your Practice','طراحی تمرین'),t(
        'Create exercises for your etude in Practice Design below.',
        'در بخش طراحی تمرین در پایین صفحه برای اتودتان تمرین بسازید.'
      ));
    }else{
      addGuideStep('target',t('Primary practice goal','هدف اصلی تمرین'),t(
        'Set the main focus for the etude, such as technique or phrasing.',
        'هدف اصلی اتود را مانند تکنیک یا جمله‌بندی مشخص کنید.'
      ));
      addGuideStep('metronome',t('Time signature','میزان‌نما'),t(
        'Choose a meter, or keep it free for a more flexible etude.',
        'میزان‌نما را انتخاب کنید یا برای اتود آزاد، بدون میزان نگه دارید.'
      ));
      addGuideStep('wand',t('Generate & Practice Design','تولید اتود و طراحی تمرین'),t(
        'After AI generates or regenerates the etude, its notes appear on the Score below. Use Practice Design to create your exercises.',
        'پس از تولید یا تولید مجدد اتود با هوش مصنوعی، نت‌های آن روی خط حامل پایین نمایش داده می‌شوند. سپس می‌توانید در بخش طراحی تمرین، تمرین‌های خود را بسازید.'
      ));
    }
  }

  let catalog = null;
  let busy = false;
  // Empty-etude AI selection is a workflow gate, not a check that can be
  // bypassed by manually placing one note on the staff.
  const practiceLocked = () => state.mode === 'ai' && state.awaitingFirstAI;
  let previouslyUnsupported = false;
  const isReplace = () => Boolean(etude.notes?.length || etude.practiceSequence?.length);
  const sync = () => {
    manual.classList.toggle('active', state.mode === 'manual');
    ai.classList.toggle('active', state.mode === 'ai');
    manual.setAttribute('aria-pressed', String(state.mode === 'manual'));
    ai.setAttribute('aria-pressed', String(state.mode === 'ai'));
    content.hidden = state.mode !== 'ai';
    for (const [id, entry] of radios) {
      entry.radio.checked = state.musicSystem === id;
      entry.radio.disabled = busy || !musicCatalog;
    }
    // Manual key-signature tuning is shown only for Iranian music.
    signatureActions.hidden = state.musicSystem !== 'iranian';
    signatureHint.textContent = state.musicSystem === 'iranian'
      ? t('Selecting a Dastgah sets the Score key signature and piano tuning. Use Set Key Signature to fine-tune it.',
          'با انتخاب دستگاه، سرکلید و کوک پیانو تنظیم می‌شود. برای تنظیم دقیق‌تر، از تنظیم سرکلید استفاده کنید.')
      : t('Selecting a scale or mode automatically sets the Score key signature.',
          'با انتخاب گام یا مد، سرکلید خط حامل به‌صورت خودکار تنظیم می‌شود.');
    syncGuide();
    editSignature.disabled = busy;
    styleInput.disabled = busy || !musicCatalog;
    tonicInput.disabled = busy || !musicCatalog;
    tonicLabel.hidden = state.musicSystem !== 'western';
    tonicField.hidden = tonicLabel.hidden;
    stylePicker.sync();
    tonicPicker.sync();
    meterInput.value = state.meterConfirmed ? (etude.meter || 'none') : '';
    meterInput.disabled = busy || isRecording();
    meterPicker.sync();
    meterHint.hidden = state.mode !== 'ai' || state.meterConfirmed;
    const unsupported = state.goal === 'chord-recognition';
    generateLabel.textContent = isReplace()
      ? t('Regenerate Etude', 'تولید مجدد اتود')
      : t('Generate Etude', 'تولید اتود');
    generate.disabled = busy || !catalog || !musicCatalog || !state.goal ||
      !state.styles[state.musicSystem] || !state.meterConfirmed || unsupported;
    goalInput.disabled = busy;
    goalPicker.sync();
    manual.disabled = ai.disabled = busy;
    if (unsupported) showStudioMessage(status, t(
      'Chord recognition needs polyphonic notation, which the current score does not support.',
      'تشخیص آکورد به نت‌نویسی چندصدایی نیاز دارد که خط حامل فعلی پشتیبانی نمی‌کند.'
    ), 'error');
    else if (previouslyUnsupported) showStudioMessage(status, '');
    previouslyUnsupported = unsupported;
  };
  const changeMode = value => {
    if (busy) return;
    if (state.mode !== value) {
      state.awaitingFirstAI = value === 'ai' &&
        !etude.notes?.length && !etude.practiceSequence?.length;
      state.mode = value;
    }
    sync();
    onModeChange?.(practiceLocked(), state.mode === 'ai' && !state.meterConfirmed, state.mode);
  };
  manual.onclick = () => changeMode('manual');
  ai.onclick = () => {
    if(busy)return;
    changeMode('ai');
    if(state.mode==='ai')showMobileAIGuide(fa);
  };
  goalInput.onchange = () => {
    state.goal = goalInput.value;
    showStudioMessage(status, '');
    sync();
  };

  sync();
  loadMusicSystems().then(data => {
    if (!host.isConnected) return;
    musicCatalog = data;
    for (const system of data.systems) {
      const entry = radios.get(system.id);
      if (entry) entry.name.textContent = localized(system.label, fa);
    }
    tonicInput.replaceChildren();
    for (const tonic of data.tonics) {
      const option = create('option', tonicInput, tonicDisplayName(tonic, fa));
      option.value = tonic.id;
    }
    if (!data.tonics.some(tonic => tonic.id === state.tonic)) {
      state.tonic = data.tonics[0]?.id || 'C';
    }
    tonicInput.value = state.tonic;
    fillStyleOptions();
    sync();
  }).catch(error => {
    if (host.isConnected) showStudioMessage(status,
      t('Could not load musical systems: ', 'بارگیری سیستم‌های موسیقایی ناموفق بود: ') +
        error.message, 'error');
  });
  loadPracticeCatalog().then(data => {
    if (!host.isConnected) return;
    catalog = data;
    for (const group of data.categories) {
      const optgroup = create('optgroup', goalInput);
      optgroup.label = localized(group, fa);
      for (const goal of data.goals.filter(g => g.category === group.id)) {
        const option = create('option', optgroup, localized(goal.label, fa));
        option.value = goal.id;
      }
    }
    goalInput.value = data.goals.some(g => g.id === state.goal) ? state.goal : '';
    sync();
  }).catch(error => {
    if (host.isConnected) showStudioMessage(status, t(
      'Could not load practice goals: ', 'بارگیری هدف‌های تمرین ناموفق بود: '
    ) + error.message, 'error');
  });

  generate.onclick = async () => {
    if (busy || !catalog || !musicCatalog || !state.goal || !state.meterConfirmed ||
        !state.styles[state.musicSystem] || state.goal === 'chord-recognition') return;
    if (isRecording()) {
      showStudioMessage(status, t(
        'Stop recording before generating an etude.',
        'قبل از تولید اتود، ضبط را متوقف کنید.'
      ), 'error');
      return;
    }
    const goal = state.goal;
    const context = {...selectedContext(),meter:etude.meter||'none',
      measureCount:etude.measureCount||4};
    if (isReplace()) {
      const approved = await confirmStudioAction({
        title: t('Replace this etude?', 'اتود فعلی جایگزین شود؟'),
        description: t(
          'Regenerating replaces the current notes, tuning and all practice steps with a new etude and one practice for the selected goal. This cannot be undone.',
          'تولید مجدد، نت‌ها، کوک و تمام مراحل تمرین قبلی را با یک اتود جدید و یک تمرین برای هدف انتخاب‌شده جایگزین می‌کند. این کار قابل بازگشت نیست.'
        ),
        cancelLabel: t('Keep current etude', 'حفظ اتود فعلی'),
        confirmLabel: t('Replace and generate', 'جایگزینی و تولید'),
        destructive: true
      });
      if (!approved || !host.isConnected || !isCurrent()) return;
    }
    const controller = new AbortController();
    state.controller = controller;
    busy = true;
    showStudioMessage(status, t('Generating a goal-based etude…', 'در حال تولید اتود متناسب با هدف…'));
    sync();
    try {
      // Pass only the explicitly selected goal. The old plan must never leak
      // into an entirely new composition request.
      const result = await generateStudioEtude(context, etude, controller.signal, [goal]);
      if (controller.signal.aborted || !host.isConnected || !isCurrent()) return;
      state.awaitingFirstAI = false;
      onGenerated({
        ...result,
        practiceSequence: [newPracticeStep(goal, catalog)]
      });
    } catch (error) {
      if (error.name !== 'AbortError' && host.isConnected) {
        showStudioMessage(status, t('Generation failed: ', 'تولید اتود ناموفق بود: ') + error.message, 'error');
      }
    } finally {
      if (state.controller === controller) state.controller = null;
      busy = false;
      if (host.isConnected) sync();
    }
  };

  return {
    currentMode: () => state.mode,
    selectAI: () => changeMode('ai'),
    isPracticeLocked: practiceLocked,
    needsMeterChoice: () => state.mode === 'ai' && !state.meterConfirmed,
    confirmMeterSelection: () => {state.meterConfirmed = true; if (host.isConnected) sync();},
    syncMeter: () => {if (host.isConnected) sync();}
  };
}
