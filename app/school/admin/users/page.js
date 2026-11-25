'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SchoolAdminUsersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/school'); }, [router]);
  return null;
}
