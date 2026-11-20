// Versioned practice plan helpers. Never import app.js: these run independently in
// the Studio UI, local persistence, and import/export validation.
const uid = () => globalThis.crypto?.randomUUID?.() ??
  'step-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
const numeric = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
export const practicePlan = etude => {
  if (!Array.isArray(etude.practiceSequence)) etude.practiceSequence = [];
  return etude.practiceSequence;
};
export const newPracticeStep = (goal, catalog) => {
  const def = catalog.goals.find(item => item.id === goal);
  if (!def) throw Error('Unknown practice goal');
  return {
    id: uid(), goal: def.id, enabled: true, title: '',
    content: { scope: def.scope, selectedIndices: [], groupSize: def.scope === 'pairs' ? 2 : 1 },
    response: { method: def.defaultResponse },
    reference: { timing: goal === 'sight-singing' ? 'none' : 'before', repeat: 1 },
    feedback: { timing: 'after', revealCorrect: true },
    assessment: { toleranceCents: 35, responseSeconds: 8, attempts: 1, tuner: false },
    flow: { onIncorrect: 'next' }
  };
};
export function validatePracticeStep(step, catalog = null) {
  if (!step || typeof step !== 'object' || Array.isArray(step) ||
    typeof step.id !== 'string' || step.id.length < 1 || step.id.length > 120 ||
    typeof step.goal !== 'string' || step.goal.length > 80 ||
    typeof step.title !== 'string' || step.title.length > 160 ||
    typeof step.enabled !== 'boolean') return false;
  const goal = catalog?.goals.find(item => item.id === step.goal);
  if (catalog && !goal) return false;
  if (!step.content || typeof step.content.scope !== 'string' ||
    step.content.scope.length > 40 ||
    (catalog && !Object.hasOwn(catalog.scopes, step.content.scope)) ||
    !Array.isArray(step.content.selectedIndices) ||
    step.content.selectedIndices.length > 4096 ||
    !step.content.selectedIndices.every(x => Number.isInteger(x) && x >= 0 && x < 100000) ||
    !Number.isInteger(step.content.groupSize) || !numeric(step.content.groupSize, 1, 64)) return false;
  if (!step.response || typeof step.response.method !== 'string' ||
    step.response.method.length > 40 ||
    (catalog && !Object.hasOwn(catalog.responses, step.response.method)) ||
    (goal && !goal.responses.includes(step.response.method))) return false;
  if (!step.reference || typeof step.reference.timing !== 'string' ||
    step.reference.timing.length > 40 ||
    (catalog && !Object.hasOwn(catalog.referenceTimings, step.reference.timing)) ||
    !Number.isInteger(step.reference.repeat) || !numeric(step.reference.repeat, 1, 12)) return false;
  if (!step.feedback || typeof step.feedback.timing !== 'string' ||
    step.feedback.timing.length > 40 ||
    (catalog && !Object.hasOwn(catalog.feedbackTimings, step.feedback.timing)) ||
    typeof step.feedback.revealCorrect !== 'boolean') return false;
  if (!step.assessment || !numeric(step.assessment.toleranceCents, 1, 200) ||
    !numeric(step.assessment.responseSeconds, 1, 120) ||
    !Number.isInteger(step.assessment.attempts) || !numeric(step.assessment.attempts, 1, 12) ||
    typeof step.assessment.tuner !== 'boolean') return false;
  if (!step.flow || typeof step.flow.onIncorrect !== 'string' ||
    step.flow.onIncorrect.length > 40 ||
    (catalog && !Object.hasOwn(catalog.retryPolicies, step.flow.onIncorrect))) return false;
  return true;
}
export function validatePracticeSequence(value, catalog = null) {
  if (value === undefined) return true; // backward compatibility with v1 files.
  if (!Array.isArray(value) || value.length > 100) return false;
  const ids = new Set();
  return value.every(step => {
    if (!validatePracticeStep(step, catalog) || ids.has(step.id)) return false;
    ids.add(step.id);
    return true;
  });
}
export function assessPracticeContent(etude, step) {
  const count = etude.notes?.length || 0;
  if (!count) return 'empty';
  if (step.content.scope === 'selected' &&
    (!step.content.selectedIndices.length ||
    step.content.selectedIndices.some(i => i >= count))) return 'selection';
  if (step.content.scope === 'pairs' && count < 2) return 'pairs';
  if (step.content.scope === 'phrases' && count < 2) return 'phrases';
  // The existing score only models a monophonic note stream. Real chord
  // generation, phrase segmentation and rhythm evaluation are NOT implemented.
  if (step.goal === 'chord-recognition') return 'polyphony';
  return null;
}
export function localized(item, fa) {
  return fa ? item.fa : item.en;
}
