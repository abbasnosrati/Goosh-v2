import { loadPracticeCatalog } from './studio-practice.js?v=practice-flow-2';
import { loadMusicSystems } from './music-catalog.js';
import { signatureForMusic } from './music-signature.js';
import { newPracticeStep, localized } from './practice-model.js';
import { METER_PRESETS } from './model.js';
import { generateStudioEtude } from './ai-etude.js?v=ai-meter-measure-choice-1';
import { confirmStudioAction, showStudioMessage } from './studio-dialog.js';

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


// Mobile-only presentation adapter: original native select remains authoritative.
let mobileMusicPickerId=0;
function attachMusicBottomSheet(wrapper, select, heading, fa){
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
    if(select.disabled||!select.isConnected||!window.matchMedia(
      '(max-width: 700px), (pointer: coarse) and (orientation: landscape) and (max-height: 520px)'
    ).matches)return;
    const dialog=create('dialog',wrapper,null,'studio-mobile-picker-dialog');
    const header=create('div',dialog,null,'studio-mobile-picker-header');
    const label=create('h2',header,title());
    label.id='studio-music-picker-'+(++mobileMusicPickerId);
    dialog.setAttribute('aria-labelledby',label.id);
    const close=create('button',header,'×','studio-mobile-picker-close');
    close.setAttribute('aria-label',fa?'بستن فهرست انتخاب':'Close choices');
    close.type='button';
    close.onclick=()=>dialog.close();
    const choices=create('div',dialog,null,'studio-mobile-picker-options');
    let selectedButton=null;
    for(const option of select.options){
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
  onToggleKeySignature, signatureIcon, returnSignatureIcon, signatureEditing = false,
  isMobileSignatureView = () => false, onMeterSelect
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
  host.classList.toggle('studio-mobile-signature-view', isMobileSignatureView());
  // Manual/AI and the musical choices share one settings surface.
  const sharedMusic = create('div', host, null, 'studio-compose-music');
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
  const content = create('div', host, null, 'studio-compose-ai');
  const intro = create('p', content, t(
    'Choose a learning goal before generating the notes. One score can then support multiple practices.',
    'قبل از تولید نت‌ها، هدف آموزشی را انتخاب کنید. سپس می‌توانید چند تمرین مختلف روی همان نت‌ها بسازید.'
  ), 'studio-compose-description');
  const musicSystem = create('fieldset', sharedMusic, null, 'studio-music-system');
  create('legend', musicSystem, t('Musical system', 'سیستم موسیقایی'));
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
      // Leave the editor if the user changes systems while it is open.
      if (id === 'western' && signatureEditing)
        onToggleKeySignature?.(false);
    };
  }
  const fields = create('div', sharedMusic, null, 'studio-compose-fields');
  // display:contents on Desktop preserves the original grid and labels.
  const styleField = create('div', fields, null, 'studio-select-field');
  const styleLabel = create('label', styleField, null, 'practice-field');
  const styleHeading = create('span', styleLabel);
  const styleInput = create('select', styleLabel);
  styleInput.classList.add('studio-native-music-select');
  styleInput.onchange = () => {
    state.styles[state.musicSystem] = styleInput.value;
    applySelectedSignature();
    showStudioMessage(status, '');
    sync();
  };
  const stylePicker = attachMusicBottomSheet(styleField, styleInput, styleHeading, fa);
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
  const tonicPicker = attachMusicBottomSheet(tonicField, tonicInput, tonicHeading, fa);
  tonicField.hidden = state.musicSystem !== 'western';
  const signatureHint = create('p', sharedMusic, null, 'studio-compose-music-hint');
  // One persistent-position toggle beside the Iranian/Western radios:
  // it opens the existing editor and becomes Back to Score in-place.
  const mobileSignaturePlacement = isMobileSignatureView();
  const signatureActions = create('div',
    mobileSignaturePlacement ? fields : musicOptions, null, 'studio-signature-actions');
  const editSignature = create('button', signatureActions, null, 'signature-toggle studio-signature-entry');
  editSignature.type = 'button';
  const signatureLabel = signatureEditing
    ? t('Back to Score','بازگشت به خط حامل')
    : t('Set Key Signature','تنظیم سرکلید');
  editSignature.setAttribute('aria-label', signatureLabel);
  editSignature.setAttribute('aria-pressed', String(signatureEditing));
  const editIcon = (signatureEditing ? returnSignatureIcon : signatureIcon)?.();
  if (editIcon) {
    editIcon.classList.add('score-switch-symbol');
    editSignature.append(editIcon);
  }
  create('span', editSignature, signatureLabel, 'signature-toggle-label');
  editSignature.onclick = () => {
    if (!busy && state.musicSystem === 'iranian')
      onToggleKeySignature?.(!signatureEditing);
  };
  // Primary Practice Goal and Generate are AI-only, unlike the music selector.
  const goalLabel = create('label', content, null, 'practice-field studio-compose-goal');
  create('span', goalLabel, t('Primary practice goal', 'هدف اصلی تمرین'));
  const goalInput = create('select', goalLabel);
  const placeholder = create('option', goalInput, t('Select a goal…', 'انتخاب هدف تمرین…'));
  placeholder.value = '';

  // Mobile mirror of the canonical Score time-signature selector.
  const meterField = create('div', content, null,
    'studio-select-field studio-compose-mobile-meter');
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
  const meterPicker = attachMusicBottomSheet(meterField, meterInput, meterHeading, fa);
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
  const status = create('p', content, null, 'studio-compose-status');
  const note = create('p', content, t(
    'Adding a new practice below will never regenerate or replace these notes.',
    'افزودن تمرین جدید در بخش طراحی تمرین، نت‌های اتود را دوباره تولید یا جایگزین نمی‌کند.'
  ), 'studio-compose-footnote');

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
    generate.textContent = isReplace()
      ? t('Regenerate Etude', 'تولید مجدد اتود')
      : t('Generate Etude', 'تولید اتود');
    generate.disabled = busy || !catalog || !musicCatalog || !state.goal ||
      !state.styles[state.musicSystem] || !state.meterConfirmed || unsupported;
    goalInput.disabled = busy;
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
    onModeChange?.(practiceLocked(), state.mode === 'ai' && !state.meterConfirmed);
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
    selectAI: () => changeMode('ai'),
    isPracticeLocked: practiceLocked,
    needsMeterChoice: () => state.mode === 'ai' && !state.meterConfirmed,
    confirmMeterSelection: () => {state.meterConfirmed = true; if (host.isConnected) sync();},
    syncMeter: () => {if (host.isConnected) sync();}
  };
}
