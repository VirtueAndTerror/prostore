'use client';

import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import React from 'react';

export default function SignOutButton() {
  return (
    <Button
      className='w-full py-4 px-2 h-4 justify-start'
      variant='ghost'
      onClick={() => signOut()}
    >
      SignOut
    </Button>
  );
}
