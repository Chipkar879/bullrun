// Run from the project folder:  node scripts/validate-modules.js          (checks all 8 modules)
//                               node scripts/validate-modules.js 1 2      (checks only modules 1 and 2)
const fs = require('fs');
const path = require('path');

const EXPECTED_LESSONS = 12;
const EXPECTED_QUESTIONS = 5;
const dir = path.join(process.cwd(), 'app', 'data');
const wanted = process.argv.slice(2).map(Number).filter(Boolean);
const mods = wanted.length ? wanted : [1, 2, 3, 4, 5, 6, 7, 8];

let errors = 0;
const fail = (m) => { errors++; console.log('  FAIL: ' + m); };
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

for (const n of mods) {
  const file = path.join(dir, `Mod_${n}.json`);
  console.log(`Mod_${n}.json`);
  const before = errors;
  let raw, mod;
  try { raw = fs.readFileSync(file, 'utf8'); mod = JSON.parse(raw); }
  catch (e) { fail('cannot read or parse JSON: ' + e.message); continue; }

  if (/[^\x00-\x7F]/.test(raw)) console.log('  note: file contains non-ASCII characters (fine for the app; only matters if you paste it into PowerShell)');
  if (mod.id !== `mod-${n}`) fail(`id should be "mod-${n}" but is "${mod.id}"`);
  if (!nonEmpty(mod.title)) fail('empty module title');
  const subs = mod.submodules;
  if (!Array.isArray(subs)) { fail('submodules is not an array'); continue; }
  if (subs.length !== EXPECTED_LESSONS) fail(`has ${subs.length} lessons, expected ${EXPECTED_LESSONS}`);

  const seen = new Set();
  subs.forEach((s, i) => {
    const where = `lesson ${i + 1}`;
    const wantId = `submod-${n}-${i + 1}`;
    if (s.id !== wantId) fail(`${where}: id is "${s.id}", expected "${wantId}"`);
    if (seen.has(s.id)) fail(`${where}: duplicate id ${s.id}`);
    seen.add(s.id);
    if (!nonEmpty(s.title) || !s.title.startsWith(`${i + 1}. `)) fail(`${where}: title must start with "${i + 1}. " (got "${s.title}")`);
    if (!nonEmpty(s.intro)) fail(`${where}: empty intro`);
    if (!nonEmpty(s.content)) fail(`${where}: empty content`);
    if (!Array.isArray(s.quiz) || s.quiz.length !== EXPECTED_QUESTIONS) { fail(`${where}: quiz has ${s.quiz && s.quiz.length} questions, expected ${EXPECTED_QUESTIONS}`); return; }
    s.quiz.forEach((q, k) => {
      const qw = `${where}, question ${k + 1}`;
      if (!nonEmpty(q.question)) fail(`${qw}: empty question`);
      if (!Array.isArray(q.options) || q.options.length !== 4) fail(`${qw}: needs exactly 4 options`);
      else {
        q.options.forEach((o, oi) => { if (!nonEmpty(o)) fail(`${qw}: option ${oi + 1} is empty`); });
        if (new Set(q.options).size !== 4) fail(`${qw}: options are not all different`);
      }
      if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) fail(`${qw}: correctIndex must be 0-3`);
      if (!nonEmpty(q.explanation)) fail(`${qw}: empty explanation`);
    });
    const pos = new Set(s.quiz.map(q => q.correctIndex));
    if (pos.size < 2) fail(`${where}: all correct answers are in the same position`);
  });
  if (errors === before) console.log('  OK');
}
console.log(errors === 0 ? '\nALL CHECKS PASSED' : `\n${errors} PROBLEM(S) FOUND`);
process.exit(errors === 0 ? 0 : 1);
