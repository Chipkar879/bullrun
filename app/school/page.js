'use client';

import Link from 'next/link';
import SchoolShell from '@/components/school/SchoolShell';
import SchoolUsersSection from '@/components/school/SchoolUsersSection';
import { inr, fmtDate, mean, worth } from '@/components/school/format';

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
        <section className="space-y-2 rounded-2xl border border-bull-line bg-bull-surface p-4 text-sm">
          <Link href="/school/manage" className="inline-block rounded-lg bg-bull-lime px-4 py-2 text-sm font-bold text-bull-ink">Teachers, classes and students</Link>
          <Link href="/school/admin" className="ml-2 inline-block rounded-lg border border-bull-line bg-bull-raised px-4 py-2 text-sm font-bold text-white">Users, access and progress</Link>
          {school.paid_until && <p>Paid until <strong className="text-white">{fmtDate(school.paid_until)}</strong>.</p>}
          {school.payment_due_at && <p>Payment due by <strong className="text-white">{fmtDate(school.payment_due_at)}</strong>.</p>}
          {school.locked_price && <p>Plan price {inr(school.locked_price)} per 30 days.</p>}
          {pending > 0 && (
            <p className="text-amber-300">
              {pending} teacher{pending === 1 ? '' : 's'} waiting for approval.{' '}
              <Link href="/school/manage" className="underline">Open the School tab</Link>
            </p>
          )}
          {!school.paid_until && !school.payment_due_at && !school.locked_price && pending === 0 && <p className="text-slate-400">Nothing needs your attention.</p>}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-base font-black text-white">Your classes</h2>
          {classes.length === 0 && <p className="text-sm text-slate-400">No classes are assigned to you yet.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {classes.map((c) => {
              const list = students.filter((s) => String(s.specific_class_id) === String(c.id));
              return (
                <Link key={c.id} href={'/school/class/' + c.id}
                  className="rounded-2xl border border-bull-line bg-bull-surface p-4 transition-colors hover:border-bull-lime/60">
                  <p className="text-lg font-black text-white">{c.class_name}</p>
                  <p className="text-sm text-slate-400">{list.length} students | {list.filter((s) => s.week_seconds > 0).length} active this week</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {isAdmin && <SchoolUsersSection />}
    </div>
  );
}

export default function SchoolHomePage() {
  return <SchoolShell active="home">{({ data, isAdmin }) => <Home data={data} isAdmin={isAdmin} />}</SchoolShell>;
}
