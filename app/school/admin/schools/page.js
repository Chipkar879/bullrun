'use client';

import Page from '@/app/admin/schools/page';
import StudentsOnly from '@/components/school/StudentsOnly';

export default function SchoolAdminPage() {
  return (
    <StudentsOnly>
      <Page />
    </StudentsOnly>
  );
}
