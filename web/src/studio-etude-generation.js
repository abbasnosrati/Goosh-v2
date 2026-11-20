import { loadPracticeCatalog } from './studio-practice.js?v=goal-first-1';
import { newPracticeStep, localized } from './practice-model.js';
import { generateStudioEtude } from './ai-etude.js?v=practice-goal-flow-1';
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
  etude, fa, isRecording, isCurrent, onGenerated
}) {
  const t = (en, ir) => fa ? ir : en;
  let state = states.get(etude);
  if (!state) {
    state = { mode: 'manual', goal: '', dastgah: 'shur', controller: null };
    states.set(etude, state);
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

  const content = create('div', host, null, 'studio-compose-ai');
  const intro = create('p', content, t(
    'Choose a learning goal before generating the notes. One score can then support multiple practices.',
    'قبل از تولید نت‌ها، هدف آموزشی را انتخاب کنید. سپس می‌توانید چند تمرین مختلف روی همان نت‌ها بسازید.'
  ), 'studio-compose-description');
  const fields = create('div', content, null, 'studio-compose-fields');
  const goalLabel = create('label', fields, null, 'practice-field');
  create('span', goalLabel, t('Learning goal', 'هدف آموزشی'));
  const goalInput = create('select', goalLabel);
  const placeholder = create('option', goalInput, t('Select a goal…', 'انتخاب هدف تمرین…'));
  placeholder.value = '';
  const dastgahLabel = create('label', fields, null, 'practice-field');
  create('span', dastgahLabel, t('Dastgah', 'دستگاه'));
  const dastgahInput = create('select', dastgahLabel);
  for (const [value, en, ir] of [
    ['shur', 'Shur', 'شور'],
    ['segah', 'Segah', 'سه‌گاه'],
    ['mahur', 'Mahur', 'ماهور'],
    ['homayun', 'Homayun', 'همایون']
  ]) {
    const option = create('option', dastgahInput, t(en, ir));
    option.value = value;
  }
  dastgahInput.value = state.dastgah;
  dastgahInput.onchange = () => { state.dastgah = dastgahInput.value; };

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
  let previouslyUnsupported = false;
  const isReplace = () => Boolean(etude.notes?.length || etude.practiceSequence?.length);
  const sync = () => {
    manual.classList.toggle('active', state.mode === 'manual');
    ai.classList.toggle('active', state.mode === 'ai');
    manual.setAttribute('aria-pressed', String(state.mode === 'manual'));
    ai.setAttribute('aria-pressed', String(state.mode === 'ai'));
    content.hidden = state.mode !== 'ai';
    const unsupported = state.goal === 'chord-recognition';
    generate.textContent = isReplace()
      ? t('Regenerate Etude', 'تولید مجدد اتود')
      : t('Generate Etude', 'تولید اتود');
    generate.disabled = busy || !catalog || !state.goal || unsupported;
    goalInput.disabled = busy;
    dastgahInput.disabled = busy;
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
    state.mode = value;
    sync();
  };
  manual.onclick = () => changeMode('manual');
  ai.onclick = () => changeMode('ai');
  goalInput.onchange = () => {
    state.goal = goalInput.value;
    showStudioMessage(status, '');
    sync();
  };

  sync();
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
    if (busy || !catalog || !state.goal || state.goal === 'chord-recognition') return;
    if (isRecording()) {
      showStudioMessage(status, t(
        'Stop recording before generating an etude.',
        'قبل از تولید اتود، ضبط را متوقف کنید.'
      ), 'error');
      return;
    }
    const goal = state.goal;
    const dastgah = state.dastgah;
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
      const result = await generateStudioEtude(dastgah, etude, controller.signal, [goal]);
      if (controller.signal.aborted || !host.isConnected || !isCurrent()) return;
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

  return { selectAI: () => changeMode('ai') };
}
