'use client';

import { useAdmin } from '@/components/admin/AdminProvider';
import SchoolAdminProvider from './SchoolAdminProvider';
import StudentsOnly from './StudentsOnly';
import UsersPage from '@/app/admin/users/page';

function Toast() {
  const { toast } = useAdmin();
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${toast.type === 'error' ? 'border-rose-800 bg-rose-950 text-rose-300' : 'border-emerald-800 bg-emerald-950 text-emerald-300'}`}>
      {toast.message}
    </div>
  );
}

export default function SchoolUsersSection() {
  return (
    <SchoolAdminProvider>
      <StudentsOnly>
        <UsersPage />
      </StudentsOnly>
      <Toast />
    </SchoolAdminProvider>
  );
}
