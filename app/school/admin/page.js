'use client';

import Page from '@/app/admin/page';
import StudentsOnly from '@/components/school/StudentsOnly';

export default function SchoolAdminPage() {
  return (
    <StudentsOnly>
      <Page />
    </StudentsOnly>
  );
}
