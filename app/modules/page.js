import Navbar from '@/components/Navbar';
import InteractiveCourseWrapper from './InteractiveCourseWrapper';
import m1 from '@/app/data/Mod_1.json';
import m2 from '@/app/data/Mod_2.json';
import m3 from '@/app/data/Mod_3.json';
import m4 from '@/app/data/Mod_4.json';
import m5 from '@/app/data/Mod_5.json';
import m6 from '@/app/data/Mod_6.json';
import m7 from '@/app/data/Mod_7.json';
import m8 from '@/app/data/Mod_8.json';

const MODS = [m1, m2, m3, m4, m5, m6, m7, m8];

// Remove correct answers and explanations before data is sent to the browser.
// Answers are checked on the server at /api/quiz-check.
function stripAnswers(m) {
  return {
    ...m,
    submodules: m.submodules.map(s => ({
      ...s,
      quiz: (s.quiz || []).map(({ question, options }) => ({ question, options })),
    })),
  };
}

function getTracks() {
  return MODS.map((m, i) => ({
    id: `track-${i + 1}`,
    trackNumber: i + 1,
    level: `Module ${i + 1}`,
    title: m.title.replace(/^Module \d+:\s*/, ''),
    description: m.submodules.map(s => s.title.replace(/^\d+\.\s*/, '')).slice(0, 3).join(' · ') + ' …',
    modules: [stripAnswers(m)],
  }));
}

export default function ModulesPage() {
  const initialTracks = getTracks();
  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-24 pb-16">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="space-y-2 mb-10 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 bg-bull-raised border border-bull-line text-bull-lime text-xs uppercase tracking-widest font-black px-3.5 py-1 rounded-full shadow-inner mb-2 font-mono">🎓 Bull Run</span>
          <h1 className="font-poppins font-black text-3xl sm:text-4xl text-white tracking-tight">Interactive Learning Arena</h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl font-medium">Complete modules and submodules sequentially to earn XP and unlock the next ones.</p>
        </div>
        <InteractiveCourseWrapper initialTracks={initialTracks} />
      </div>
    </main>
  );
}