// Server-side list of every module. When modules 9-12 are added, import them here
// (and in app/modules/page.js) and add them to MODS.
import m1 from '@/app/data/Mod_1.json';
import m2 from '@/app/data/Mod_2.json';
import m3 from '@/app/data/Mod_3.json';
import m4 from '@/app/data/Mod_4.json';
import m5 from '@/app/data/Mod_5.json';
import m6 from '@/app/data/Mod_6.json';
import m7 from '@/app/data/Mod_7.json';
import m8 from '@/app/data/Mod_8.json';
import { lessonOrder, moduleTotals } from '@/lib/progressLogic';

export const MODS = [m1, m2, m3, m4, m5, m6, m7, m8];
export const ORDER = lessonOrder(MODS);
export const TOTALS = moduleTotals(MODS);

const LESSONS = {};
MODS.forEach((m) => (m.submodules || []).forEach((s) => { LESSONS[s.id] = s; }));

export function getLesson(id) {
  return LESSONS[id] || null;
}
