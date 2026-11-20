import { NextResponse } from 'next/server';
import { adminClient, userFromRequest } from '@/lib/supabaseServer';
import { getLesson, ORDER } from '@/lib/moduleData';
import { gradeQuiz, isUnlocked } from '@/lib/progressLogic';

export const dynamic = 'force-dynamic';

// Grades a quiz on the server and, if passed, saves the lesson to the database.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch (e) { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const lesson = getLesson(body && body.submoduleId);
  if (!lesson) return NextResponse.json({ error: 'Unknown lesson' }, { status: 404 });

  let admin;
  try { admin = adminClient(); } catch (e) {
    console.error(e.message);
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const user = await userFromRequest(req, admin);
  if (!user) return NextResponse.json({ error: 'Please log in again' }, { status: 401 });

  const { data: rows, error: readError } = await admin
    .from('module_progress').select('submodule_id').eq('user_id', user.id);
  if (readError) {
    console.error('progress read failed', readError.message);
    return NextResponse.json({ error: 'Could not read progress' }, { status: 500 });
  }
  const done = (rows || []).map((r) => r.submodule_id);

  const graded = gradeQuiz(lesson.quiz, body.answers);
  const unlocked = isUnlocked(ORDER, lesson.id, done);
  const passed = graded.passed && unlocked;

  let nowDone = done;
  if (passed && !done.includes(lesson.id)) {
    const { error: saveError } = await admin
      .from('module_progress')
      .upsert({ user_id: user.id, submodule_id: lesson.id, source: 'quiz' }, { onConflict: 'user_id,submodule_id', ignoreDuplicates: true });
    if (saveError) {
      console.error('progress save failed', saveError.message);
      return NextResponse.json({ error: 'Could not save progress' }, { status: 500 });
    }
    nowDone = done.concat([lesson.id]);
  }

  return NextResponse.json({
    passed,
    correctCount: graded.correctCount,
    needed: graded.needed,
    results: graded.results,
    done: nowDone,
  });
}
