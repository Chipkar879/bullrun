import SchoolAdminShell from '@/components/school/SchoolAdminShell';

export const metadata = { title: 'School Admin - Bull Run' };

export default function SchoolAdminLayout({ children }) {
  return <SchoolAdminShell>{children}</SchoolAdminShell>;
}
