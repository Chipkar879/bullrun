import { NextResponse } from 'next/server';
import m1 from '@/app/data/Mod_1.json';
import m2 from '@/app/data/Mod_2.json';
import m3 from '@/app/data/Mod_3.json';
import m4 from '@/app/data/Mod_4.json';
import m5 from '@/app/data/Mod_5.json';
import m6 from '@/app/data/Mod_6.json';
import m7 from '@/app/data/Mod_7.json';
import m8 from '@/app/data/Mod_8.json';

// Checks quiz answers on the server so correct answers are never sent to the browser
// until the student has submitted.
const SUBMODULES = [m1, m2, m3, m4, m5, m6, m7, m8].flatMap(m => m.submodules || []);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { submoduleId, answers } = body || {};
  const sub = SUBMODULES.find(s => s.id === submoduleId);
  if (!sub || !Array.isArray(sub.quiz) || !answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Unknown lesson' }, { status: 400 });
  }

  let correctCount = 0;
  const results = sub.quiz.map((q, idx) => {
    const correct = answers[idx] === q.correctIndex;
    if (correct) correctCount++;
    return { correct, correctIndex: q.correctIndex, explanation: q.explanation };
  });

  const needed = Math.ceil(sub.quiz.length * 0.8);
  return NextResponse.json({ results, correctCount, needed, passed: correctCount >= needed });
}
