import { practicePlan, newPracticeStep, validatePracticeSequence,
  assessPracticeContent, localized } from './practice-model.js';
import { confirmStudioAction, showStudioMessage } from './studio-dialog.js';
import {meterTimeline} from './model.js';

let catalogPromise;
export function loadPracticeCatalog() {
  if (!catalogPromise) catalogPromise = fetch('./practice-goals.json', { cache: 'no-cache' })
    .then(async response => {
      if (!response.ok) throw Error('Could not load practice catalog');
      const data = await response.json();
      if (!Array.isArray(data.goals) || data.goals.length !== 10 ||
          new Set(data.goals.map(g => g.id)).size !== 10) throw Error('Invalid practice catalog');
      return data;
    }).catch(error => { catalogPromise = null; throw error; });
  return catalogPromise;
}
const create = (tag, parent, text, cls) => {
  const el = document.createElement(tag);
  if (text !== undefined && text !== null) el.textContent = text;
  if (cls) el.className = cls;
  parent.append(el);
  return el;
};
const button = (p, text, onClick, cls) => {
  const b = create('button', p, text, cls);
  b.type = 'button'; b.onclick = onClick; return b;
};
const select = (parent, label, value, entries, onChange) => {
  const wrap = create('label', parent, undefined, 'practice-field');
  create('span', wrap, label);
  const input = create('select', wrap);
  for (const [id, name] of entries) {
    const option = create('option', input, name);
    option.value = id;
  }
  input.value = value;
  input.onchange = () => onChange(input.value);
  return input;
};
const number = (parent, label, value, min, max, step, onChange) => {
  const wrap = create('label', parent, undefined, 'practice-field');
  create('span', wrap, label);
  const input = create('input', wrap);
  input.type = 'number';input.min = String(min);input.max = String(max);
  input.step = String(step);input.value = String(value);
  input.onchange = () => {
    if (!input.reportValidity()) {input.value = String(value);return;}
    onChange(Number(input.value));
  };
};
const checkbox = (parent,label,value,onChange) => {
  const wrap=create('label',parent,undefined,'practice-check');
  const input=create('input',wrap);input.type='checkbox';input.checked=value;
  create('span',wrap,label);input.onchange=()=>onChange(input.checked);
};
const pairOptions = (object,fa) => Object.entries(object).map(([id,text])=>[id,localized(text,fa)]);
const hasMic = step => step.response.method === 'mic';

// Freeze authoring while an empty AI Etude is waiting for its first score.
// This is presentation-only: it never deletes existing practices or notes.
export function setStudioPracticeLocked(host, locked, fa) {
  const section = host.querySelector('.practice-designer');
  if (!section) return;
  let info = host.querySelector('.practice-frozen-message');
  if (!info) {
    info = document.createElement('p');
    info.className = 'practice-frozen-message';
    host.prepend(info);
  }
  info.textContent = fa
    ? 'ابتدا در حالت هوش مصنوعی، هدف تمرین را انتخاب و اتود را تولید کنید. بعد از تولید، تنظیمات و افزودن تمرین اینجا فعال می‌شوند.'
    : 'First select a practice goal and generate an AI etude. Practice settings and additional exercises will become available here.';
  info.hidden = !locked;
  section.inert = Boolean(locked);
  section.classList.toggle('practice-frozen', Boolean(locked));
  section.setAttribute('aria-hidden', String(Boolean(locked)));
}

export async function renderStudioPractice(host, etude, options) {
  const { fa, save } = options, tr = (en,ir)=>fa?ir:en;
  host.replaceChildren();
  const section = create('section', host, undefined, 'practice-designer');
  setStudioPracticeLocked(host, Boolean(options.locked), fa);
  const head = create('div', section, undefined, 'practice-heading');
  const title = create('div', head);
  create('h2', title, tr('Practice Design','طراحی تمرین'));
  create('p', title, tr('Add ordered exercises to this etude. Each has its own settings.',
    'برای این اتود چند بخش تمرینی مستقل و مرتب بسازید.'));
  const catalog = await loadPracticeCatalog().catch(error => {
    create('p',section,tr('Cannot load practice goals: ','بارگیری اهداف تمرین ناموفق بود: ')+error.message,'practice-warning');
    return null;
  });
  if (!catalog || !section.isConnected) return;
  const items=practicePlan(etude);
  const change=(preferredId=null)=>{
    if(!validatePracticeSequence(items,catalog))throw Error('Invalid practice step');
    const expanded=[...section.querySelectorAll('.practice-step[open]')].map(node=>node.dataset.stepId);
    if(preferredId)expanded.push(preferredId);
    const expandedAdvanced=[...section.querySelectorAll('.practice-advanced[open]')]
      .map(node=>node.parentElement?.dataset.stepId);
    save();
    renderStudioPractice(host,etude,{...options,expanded,expandedAdvanced,
      locked:section.inert,selectedGoal:picker.value});
  };
  const addRow=create('div',section,undefined,'practice-add-row');
  const goalField=create('label',addRow,undefined,'practice-field practice-goal-picker');
  create('span',goalField,tr('Exercise goal','هدف تمرین'));
  const picker=create('select',goalField);
  picker.setAttribute('aria-label',tr('Exercise goal','هدف تمرین'));
  const blank=create('option',picker,tr('Select a practice goal…','ابتدا هدف تمرین را انتخاب کنید…'));
  blank.value='';
  for(const group of catalog.categories) {
    const optgroup=create('optgroup',picker);
    optgroup.label=localized(group,fa);
    for(const def of catalog.goals.filter(g=>g.category===group.id)){
      const option=create('option',optgroup,localized(def.label,fa));
      option.value=def.id;
    }
  }
  picker.value=(options.selectedGoal && catalog.goals.some(g=>g.id===options.selectedGoal))
    ? options.selectedGoal : '';
  const buttons=create('div',addRow,undefined,'practice-add-actions');

  const addAction=(text,cls,handler)=>{
    const wrapper=create('div',buttons,undefined,'practice-action-wrap');
    wrapper.tabIndex=0;
    // Disabled buttons do not receive click/focus. Focus the surrounding
    // surface on touch or mouse to expose the same compact tooltip.
    wrapper.onpointerdown=()=>{if(!picker.value)wrapper.focus();};
    const action=button(wrapper,text,handler,cls);
    const tip=create('span',wrapper,tr('Select a practice goal first.','ابتدا هدف تمرین را انتخاب کنید.'),
      'practice-goal-tooltip');
    tip.setAttribute('role','tooltip');
    action.title=''; // Only one tooltip, including keyboard and touch.
    return {action,wrapper};
  };

  const add=addAction(tr('Add Exercise','افزودن تمرین'),'practice-add-button',()=>{
    if(!picker.value || section.inert)return;
    const added=newPracticeStep(picker.value,catalog);
    items.push(added);
    change(added.id);
  });
  const ai=addAction(tr('Design with AI','طراحی با AI'),'practice-ai-button',()=>{
    if(!picker.value || section.inert)return;
    openDesignDialog(picker.value);
  });
  const updateButtons=()=>{
    const disabled=!picker.value;
    for(const {action,wrapper} of [add,ai]){
      action.disabled=disabled;
      wrapper.classList.toggle('needs-goal',disabled);
      wrapper.tabIndex=disabled?0:-1;
      wrapper.setAttribute('aria-label',disabled
        ? tr('Select a practice goal first.','ابتدا هدف تمرین را انتخاب کنید.')
        : '');
    }
  };
  picker.onchange=updateButtons;
  updateButtons();

  function openDesignDialog(goal) {
    const definition=catalog.goals.find(entry=>entry.id===goal);
    if(!definition)return;
    const dialog=document.createElement('dialog');
    dialog.className='etude-delete-dialog practice-ai-dialog';
    dialog.setAttribute('aria-label',tr('Design an exercise with AI','طراحی تمرین با AI'));
    create('h2',dialog,tr('Design with AI','طراحی با AI'));
    const selected=create('p',dialog,undefined,'practice-ai-selected');
    create('strong',selected,tr('Goal: ','هدف: '));
    selected.append(localized(definition.label,fa));
    create('p',dialog,tr(
      'Optionally describe how the student should practice. The score will not change.',
      'در صورت نیاز روش تمرین هنرجو را توضیح دهید. نت‌های اتود تغییر نمی‌کنند.'
    ));
    const prompt=create('textarea',dialog);
    prompt.rows=3;prompt.maxLength=2000;
    prompt.setAttribute('aria-label',tr('Teacher instructions (optional)','توضیحات استاد (اختیاری)'));
    prompt.placeholder=tr(
      'e.g. Play the reference once, then answer by microphone without a tuner',
      'مثلاً مرجع یک بار پخش شود و هنرجو با میکروفن و بدون تیونر پاسخ دهد'
    );
    const status=create('p',dialog,undefined,'practice-ai-status');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const actions=create('div',dialog,undefined,'etude-delete-actions');
    const cancel=button(actions,tr('Cancel','انصراف'),()=>dialog.close(),'etude-delete-cancel');
    const controller=new AbortController();
    let pending=false;
    const generate=button(actions,tr('Generate Exercise','تولید تمرین'),async()=>{
      if(pending)return;
      pending=true;
      generate.disabled=true;
      cancel.disabled=true;
      prompt.disabled=true;
      showStudioMessage(status,tr('Designing exercise…','در حال طراحی تمرین…'));
      try {
        const response=await fetch('/api/design-practice',{
          method:'POST',headers:{'Content-Type':'application/json'},
          signal:controller.signal,
          body:JSON.stringify({
            goal,instruction:prompt.value,
            etude:{title:etude.title,bpm:etude.bpm,meter:etude.meter||'none',
              measureCount:meterTimeline(etude).bars.length,
              noteCount:etude.notes.length,
              notes:etude.notes.slice(0,128).map(n=>({m:n.m,at:n.at,d:n.d}))}
          })
        });
        const data=await response.json();
        if(controller.signal.aborted || !section.isConnected)return;
        if(!response.ok)throw Error(data.error||'AI failed');
        const item=newPracticeStep(goal,catalog);
        const spec=data.settings;
        if(!spec || typeof spec!=='object')throw Error('Invalid AI settings');
        item.content.scope=spec.scope;
        item.content.groupSize=spec.groupSize;
        item.response.method=spec.response;
        item.reference.timing=spec.reference;
        item.feedback.timing=spec.feedback;
        item.assessment.tuner=spec.tuner;
        item.assessment.toleranceCents=spec.toleranceCents;
        item.assessment.responseSeconds=spec.responseSeconds;
        item.assessment.attempts=spec.attempts;
        item.flow.onIncorrect=spec.retry;
        if(!validatePracticeSequence([...items,item],catalog))
          throw Error('AI settings are not valid for this goal');
        dialog.close();
        items.push(item);
        change(item.id);
      }catch(error){
        if(error.name!=='AbortError' && dialog.isConnected)
          showStudioMessage(status,tr('Could not design exercise: ','طراحی تمرین ناموفق بود: ')+error.message,'error');
      }finally{
        pending=false;
        if(dialog.isConnected){
          generate.disabled=false;
          cancel.disabled=false;
          prompt.disabled=false;
        }
      }
    },'primary');
    const closeOnRoute=()=>{if(dialog.open)dialog.close();};
    window.addEventListener('popstate',closeOnRoute);
    window.addEventListener('hashchange',closeOnRoute);
    dialog.onclose=()=>{
      controller.abort();
      window.removeEventListener('popstate',closeOnRoute);
      window.removeEventListener('hashchange',closeOnRoute);
      dialog.remove();
    };
    document.body.append(dialog);
    dialog.showModal();
    prompt.focus();
  }

  if(!items.length)create('p',section,tr('No exercises yet. Add the first goal to get started.',
    'هنوز تمرینی اضافه نشده؛ اولین هدف را انتخاب کنید.'),'practice-empty');
  const list=create('div',section,undefined,'practice-step-list');
  items.forEach((step,index)=>{
    const def=catalog.goals.find(g=>g.id===step.goal);
    if(!def) {
      create('p',list,tr('Unsupported exercise goal: ','هدف تمرین پشتیبانی نمی‌شود: ')+step.goal,'practice-warning');
      return;
    }
    const card=create('details',list,undefined,'practice-step');
    card.dataset.stepId=step.id;
    card.open=Boolean(options.expanded?.includes(step.id));
    const summary=create('summary',card);
    create('span',summary,tr('Practice ','تمرین ')+(index+1).toLocaleString(fa?'fa':'en'),'practice-step-index');
    const identity=create('span',summary,undefined,'practice-step-identity');
    create('strong',identity,step.title||localized(def.label,fa));
    create('small',identity,localized(def.description,fa));
    if(!step.enabled)create('span',summary,tr('Disabled','غیرفعال'),'practice-inactive');
    const actions=create('div',card,undefined,'practice-step-actions');
    const move=(offset)=>{const next=index+offset;if(next<0||next>=items.length)return;
      [items[index],items[next]]=[items[next],items[index]];change();};
    const up=button(actions,'↑',()=>move(-1), 'practice-icon');up.disabled=index===0;
    up.title=tr('Move up','انتقال به بالا');
    const down=button(actions,'↓',()=>move(1),'practice-icon');down.disabled=index===items.length-1;
    down.title=tr('Move down','انتقال به پایین');
    button(actions,tr('Duplicate','کپی'),()=>{const copy=JSON.parse(JSON.stringify(step));
      copy.id=newPracticeStep(step.goal,catalog).id;items.splice(index+1,0,copy);change();});
    button(actions,tr('Delete','حذف'),async()=>{
      const approved=await confirmStudioAction({
        title:tr('Delete this practice?','این تمرین حذف شود؟'),
        description:tr('Only this practice and its settings will be removed. The etude notes will not change.',
          'فقط همین تمرین و تنظیماتش حذف می‌شود. نت‌های اتود تغییر نمی‌کنند.'),
        cancelLabel:tr('Cancel','انصراف'),
        confirmLabel:tr('Delete practice','حذف تمرین'),
        destructive:true
      });
      if(!approved || !section.isConnected)return;
      const currentIndex=items.findIndex(item=>item.id===step.id);
      if(currentIndex<0)return;
      items.splice(currentIndex,1);change();
    },'practice-delete');
    const selectionMessage=create('p',card,undefined,'practice-warning');
    selectionMessage.hidden=true;
    const form=create('div',card,undefined,'practice-fields');
    const update=(callback)=>{callback();change();};
    const titleLabel=create('label',form,undefined,'practice-field');
    create('span',titleLabel,tr('Exercise title (optional)','عنوان تمرین (اختیاری)'));
    const titleInput=create('input',titleLabel);titleInput.maxLength=160;titleInput.value=step.title;
    titleInput.onchange=()=>update(()=>{step.title=titleInput.value.trim();});
    checkbox(form,tr('Enabled','فعال'),step.enabled,value=>update(()=>{step.enabled=value;}));
    select(form,tr('Goal','هدف آموزشی'),step.goal,catalog.goals.map(g=>[g.id,localized(g.label,fa)]),value=>{
      const fresh=newPracticeStep(value,catalog);fresh.id=step.id;fresh.title=step.title;
      items[index]=fresh;change();
    });
    select(form,tr('Content scope','محدوده محتوا'),step.content.scope,pairOptions(catalog.scopes,fa),
      value=>update(()=>{step.content.scope=value;}));
    if(step.content.scope==='selected'){
      const mark=create('label',form,undefined,'practice-field');
      create('span',mark,tr('Selected note numbers (1-based, comma-separated)',
        'شماره نت‌های انتخابی (از ۱، با ویرگول)'));
      const input=create('input',mark);
      input.value=step.content.selectedIndices.map(i=>i+1).join(', ');
      input.placeholder='1, 3, 5';
      input.onchange=()=>{
        const nums=input.value.split(/[,،\s]+/).filter(Boolean).map(Number);
        if(nums.some(n=>!Number.isInteger(n)||n<1||n>etude.notes.length)){
          selectionMessage.hidden=false;
          showStudioMessage(selectionMessage,
            tr('Use note numbers within the etude.','شماره نت‌ها باید در محدوده اتود باشد.'),'error');
          return;
        }
        update(()=>{step.content.selectedIndices=[...new Set(nums.map(n=>n-1))];});
      };
    }
    if(['pairs','each','selected'].includes(step.content.scope))
      number(form,tr('Notes per question','تعداد نت در هر سؤال'),step.content.groupSize,1,64,1,
        value=>update(()=>{step.content.groupSize=value;}));
    select(form,tr('Response method','روش پاسخ'),step.response.method,
      def.responses.map(id=>[id,localized(catalog.responses[id],fa)]),
      value=>update(()=>{step.response.method=value;if(value!=='mic')step.assessment.tuner=false;}));
    select(form,tr('Reference timing','زمان پخش مرجع'),step.reference.timing,
      pairOptions(catalog.referenceTimings,fa),value=>update(()=>{step.reference.timing=value;}));
    if(step.reference.timing!=='none')
      number(form,tr('Reference repeats','تکرار مرجع'),step.reference.repeat,1,12,1,
        value=>update(()=>{step.reference.repeat=value;}));
    select(form,tr('Feedback timing','زمان بازخورد'),step.feedback.timing,
      pairOptions(catalog.feedbackTimings,fa),value=>update(()=>{step.feedback.timing=value;}));
    if(step.feedback.timing!=='none')
      checkbox(form,tr('Reveal correct answer','نمایش پاسخ صحیح'),step.feedback.revealCorrect,
        value=>update(()=>{step.feedback.revealCorrect=value;}));
    const advanced=create('details',card,undefined,'practice-advanced');
    advanced.open=Boolean(options.expandedAdvanced?.includes(step.id));
    create('summary',advanced,tr('More settings','تنظیمات بیشتر'));
    const more=create('div',advanced,undefined,'practice-fields');
    number(more,tr('Answer time (seconds)','زمان پاسخ (ثانیه)'),step.assessment.responseSeconds,1,120,1,
      value=>update(()=>{step.assessment.responseSeconds=value;}));
    number(more,tr('Attempts','تعداد تلاش'),step.assessment.attempts,1,12,1,
      value=>update(()=>{step.assessment.attempts=value;}));
    if(hasMic(step)){
      checkbox(more,tr('Show tuner while answering','نمایش تیونر هنگام پاسخ'),step.assessment.tuner,
        value=>update(()=>{step.assessment.tuner=value;}));
      number(more,tr('Pitch tolerance (cents)','تلورانس کوک (سنت)'),
        step.assessment.toleranceCents,1,200,1,
        value=>update(()=>{step.assessment.toleranceCents=value;}));
    }
    select(more,tr('After incorrect answer','بعد از پاسخ اشتباه'),step.flow.onIncorrect,
      pairOptions(catalog.retryPolicies,fa),
      value=>update(()=>{step.flow.onIncorrect=value;}));
    const warning=assessPracticeContent(etude,step);
    if(warning)create('p',card,({
      empty:tr('Add notes to the etude before using this exercise.','برای این تمرین ابتدا نت اضافه کنید.'),
      selection:tr('Select valid note numbers.','شماره نت‌های معتبر انتخاب کنید.'),
      pairs:tr('At least two notes are required.','حداقل دو نت لازم است.'),
      phrases:tr('Check that the etude has suitable phrases.','جمله‌بندی اتود را بررسی کنید.'),
      polyphony:tr('Chord recognition requires polyphonic content not yet supported by the current score model.',
        'تشخیص آکورد به محتوای چندصدایی نیاز دارد که مدل فعلی حامل هنوز پشتیبانی نمی‌کند.')
    })[warning],'practice-warning');
  });
  const foot=create('p',section,tr('These steps are saved with the etude; the current Practice player remains unchanged.',
    'مراحل همراه اتود ذخیره می‌شوند؛ اجرای بخش Practice فعلاً تغییر نکرده است.'),'practice-footnote');
  foot.setAttribute('role','note');
}
