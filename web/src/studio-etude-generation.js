import { loadPracticeCatalog } from './studio-practice.js?v=practice-flow-2';
import { loadMusicSystems } from './music-catalog.js';
import { signatureForMusic } from './music-signature.js';
import { newPracticeStep, localized } from './practice-model.js';
import { generateStudioEtude } from './ai-etude.js?v=key-signature-sync-1';
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

export function mountEtudeComposer(host, {
  etude, fa, isRecording, isCurrent, onGenerated, onModeChange, onSignatureChange,
  onEditKeySignature, signatureIcon, signatureEditing = false
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
      controller:null, awaitingFirstAI:false
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
  const tabs = create('div', host, null, 'studio-compose-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', t('Etude creation method', 'روش ساخت اتود'));
  const manual = create('button', tabs, t('Manual', 'دستی'));
  const ai = create('button', tabs, t('AI', 'هوش مصنوعی'));
  manual.type = ai.type = 'button';
  manual.className = ai.className = 'studio-compose-tab';

  // A shared musical foundation: Manual and AI always use the same
  // canonical Etude key signature, piano and score playback frequencies.
  const sharedMusic = create('div', host, null, 'studio-compose-music');
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
    };
  }
  const fields = create('div', sharedMusic, null, 'studio-compose-fields');
  const styleLabel = create('label', fields, null, 'practice-field');
  const styleHeading = create('span', styleLabel);
  const styleInput = create('select', styleLabel);
  styleInput.onchange = () => {
    state.styles[state.musicSystem] = styleInput.value;
    applySelectedSignature();
    showStudioMessage(status, '');
    sync();
  };
  const tonicLabel = create('label', fields, null, 'practice-field');
  create('span', tonicLabel, t('Tonic', 'تونیک'));
  const tonicInput = create('select', tonicLabel);
  tonicInput.onchange = () => {
    state.tonic = tonicInput.value;
    applySelectedSignature();
  };
  create('p', sharedMusic, t(
    'Selecting a mode sets the score and piano tuning. Use Edit Key Signature to fine-tune it.',
    'با انتخاب دستگاه یا مد، سرکلید و کوک پیانو تنظیم می‌شود. برای تنظیم دقیق‌تر، از ویرایش سرکلید استفاده کنید.'
  ), 'studio-compose-music-hint');
  // Entry belongs to the shared musical settings in BOTH Manual and AI.
  // The return action lives next to the editor's heading, where it is needed.
  const signatureActions = create('div', sharedMusic, null, 'studio-signature-actions');
  const editSignature = create('button', signatureActions, null, 'signature-toggle studio-signature-entry');
  editSignature.type = 'button';
  editSignature.hidden = signatureEditing;
  editSignature.setAttribute('aria-label', t('Edit Key Signature', 'ویرایش سرکلید'));
  const editIcon = signatureIcon?.();
  if (editIcon) {
    editIcon.classList.add('score-switch-symbol');
    editSignature.append(editIcon);
  }
  create('span', editSignature, t('Edit Key Signature','ویرایش سرکلید'), 'signature-toggle-label');
  editSignature.onclick = () => onEditKeySignature?.();
  // Primary Practice Goal and Generate are AI-only, unlike the music selector.
  const goalLabel = create('label', content, null, 'practice-field studio-compose-goal');
  create('span', goalLabel, t('Primary practice goal', 'هدف اصلی تمرین'));
  const goalInput = create('select', goalLabel);
  const placeholder = create('option', goalInput, t('Select a goal…', 'انتخاب هدف تمرین…'));
  placeholder.value = '';

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
      const option = create('option', styleInput, localized(entry.label, fa));
      option.value = entry.id;
    }
    if (!system.styles.some(entry => entry.id === state.styles[state.musicSystem]))
      state.styles[state.musicSystem] = '';
    styleInput.value = state.styles[state.musicSystem];
    tonicLabel.hidden = state.musicSystem !== 'western';
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
    styleInput.disabled = busy || !musicCatalog;
    tonicInput.disabled = busy || !musicCatalog;
    tonicLabel.hidden = state.musicSystem !== 'western';
    const unsupported = state.goal === 'chord-recognition';
    generate.textContent = isReplace()
      ? t('Regenerate Etude', 'تولید مجدد اتود')
      : t('Generate Etude', 'تولید اتود');
    generate.disabled = busy || !catalog || !musicCatalog || !state.goal ||
      !state.styles[state.musicSystem] || unsupported;
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
    onModeChange?.(practiceLocked());
  };
  manual.onclick = () => changeMode('manual');
  ai.onclick = () => changeMode('ai');
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
      const option = create('option', tonicInput, tonic.label);
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
    if (busy || !catalog || !musicCatalog || !state.goal ||
        !state.styles[state.musicSystem] || state.goal === 'chord-recognition') return;
    if (isRecording()) {
      showStudioMessage(status, t(
        'Stop recording before generating an etude.',
        'قبل از تولید اتود، ضبط را متوقف کنید.'
      ), 'error');
      return;
    }
    const goal = state.goal;
    const context = selectedContext();
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

  return { selectAI: () => changeMode('ai'), isPracticeLocked: practiceLocked };
}
