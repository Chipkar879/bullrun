'use client';

import Link from 'next/link';
import SchoolShell from '@/components/school/SchoolShell';
import ClassBoard from '@/components/school/ClassBoard';
import { inr, mean, worth } from '@/components/school/format';

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl border border-bull-line bg-bull-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function Home({ data, isAdmin }) {
  const { school, students, classes } = data;
  const active = students.filter((s) => s.week_seconds > 0).length;
  const pending = data.teachers.filter((t) => t.verification_status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={isAdmin ? 'Seats used' : 'My students'} value={isAdmin ? data.seatsUsed + ' / ' + school.student_count : students.length} />
        <Kpi label="Active this week" value={active + ' / ' + students.length} />
        <Kpi label="Classes" value={classes.length} />
        <Kpi label="Avg net worth" value={inr(mean(students.map(worth)))} />
      </div>

      {isAdmin ? (
        <>
          {pending > 0 && (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
              {pending} teacher{pending === 1 ? '' : 's'} waiting for approval.{' '}
              <Link href="/school/manage" className="font-bold underline">Open the School tab</Link>
            </p>
          )}
          <ClassBoard />
        </>
      ) : (
        <ClassBoard />
      )}
    </div>
  );
}

export default function SchoolHomePage() {
  return <SchoolShell active="home">{({ data, isAdmin }) => <Home data={data} isAdmin={isAdmin} />}</SchoolShell>;
}