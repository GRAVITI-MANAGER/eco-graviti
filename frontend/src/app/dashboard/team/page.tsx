// src/app/dashboard/team/page.tsx
// Redirect to new settings location

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/settings/team');
  }, [router]);
  return null;
}
