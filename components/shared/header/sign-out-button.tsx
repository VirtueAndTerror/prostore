'use client';

import { Button } from '@/components/ui/button';
import { signOutUser } from '@/lib/actions';

const handleSignOut = async () => {
  await signOutUser();
};

const SignOutButton = () => (
  <Button
    className='w-full py-4 px-2 h-4 justify-start'
    variant='ghost'
    onClick={handleSignOut}
  >
    SignOut
  </Button>
);


export default SignOutButton;
