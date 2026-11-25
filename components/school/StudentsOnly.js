'use client';

import { useContext, useMemo } from 'react';
import { AdminContext } from '@/components/admin/AdminProvider';
import { rankProfiles } from '@/lib/admin';

// Teachers are staff, not users. Pages wrapped in this only see the school's students.
export default function StudentsOnly({ children }) {
  const ctx = useContext(AdminContext);
  const value = useMemo(() => {
    const allProfiles = rankProfiles((ctx.allProfiles || []).filter((p) => p.role === 'student'));
    const ids = new Set(allProfiles.map((p) => p.id));
    return { ...ctx, allProfiles, expiringSoon: (ctx.expiringSoon || []).filter((p) => ids.has(p.id)) };
  }, [ctx]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
