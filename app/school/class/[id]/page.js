'use client';

import { useParams } from 'next/navigation';
import SchoolShell from '@/components/school/SchoolShell';
import StudentTable from '@/components/school/StudentTable';
import { inr, mean, worth } from '@/components/school/format';

function ClassView({ data, id }) {
  const cls = data.classes.find((c) => String(c.id) === String(id));
  if (!cls) return <p className="rounded-2xl border border-bull-line bg-bull-surface p-6 text-sm text-slate-300">This class is not assigned to you.</p>;
  const list = data.students.filter((s) => String(s.specific_class_id) === String(cls.id));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Students', list.length],
          ['Active this week', list.filter((s) => s.week_seconds > 0).length + ' / ' + list.length],
          ['Avg net worth', inr(mean(list.map(worth)))],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-bull-line bg-bull-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{l}</p>
            <p className="mt-1 text-xl font-black text-white">{v}</p>
          </div>
        ))}
      </div>
      <StudentTable students={list} classes={data.classes} title={cls.class_name} />
    </div>
  );
}

export default function TeacherClassPage() {
  const { id } = useParams();
  return <SchoolShell active={'class-' + id} teacherOnly>{({ data }) => <ClassView data={data} id={id} />}</SchoolShell>;
}
