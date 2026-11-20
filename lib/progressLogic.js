// Pure helpers shared by the quiz, progress and admin routes (no imports, easy to test).
export const PASS_RATIO = 0.8;

export function lessonOrder(mods) {
  const out = [];
  (mods || []).forEach((m) => (m.submodules || []).forEach((s) => out.push(s.id)));
  return out;
}

export function moduleNumber(submoduleId) {
  const m = /^submod-(\d+)-(\d+)$/.exec(String(submoduleId));
  return m ? Number(m[1]) : null;
}

export function moduleTotals(mods) {
  const totals = {};
  lessonOrder(mods).forEach((id) => {
    const n = moduleNumber(id);
    if (n) totals[n] = (totals[n] || 0) + 1;
  });
  return totals;
}

// answers looks like { "0": 2, "1": 0 } (question number -> chosen option number)
export function gradeQuiz(quiz, answers, ratio) {
  const list = Array.isArray(quiz) ? quiz : [];
  const given = answers && typeof answers === 'object' ? answers : {};
  const results = list.map((q, i) => {
    const picked = given[i];
    return {
      correct: Number.isInteger(picked) && picked === q.correctIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation || '',
    };
  });
  const correctCount = results.filter((r) => r.correct).length;
  const needed = Math.ceil(list.length * (ratio || PASS_RATIO) - 1e-9);
  return { passed: list.length > 0 && correctCount >= needed, correctCount, needed, results };
}

// A lesson may only be passed if the one before it is already done.
export function isUnlocked(order, id, doneList) {
  const i = order.indexOf(id);
  if (i < 0) return false;
  if (i === 0) return true;
  return (doneList || []).includes(order[i - 1]);
}

// From a browser's saved list, accept only the unbroken run starting at lesson 1.
export function importablePrefix(order, local, existing) {
  const have = new Set(existing || []);
  const want = new Set(Array.isArray(local) ? local.filter((x) => typeof x === 'string') : []);
  const take = [];
  for (const id of order) {
    if (have.has(id)) continue;
    if (want.has(id)) { take.push(id); continue; }
    break;
  }
  return take;
}
