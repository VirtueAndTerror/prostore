import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { EllipsisVertical, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import ModeToggle from './mode-toggle';
import UserButton from './user-button';

const Menu = () => (
  <div className='flex justify-end gap-3'>
    <nav className='hidden md:flex w-full max-w-xs gap-1'>
      <ModeToggle />
      {/* Cart Button start */}
      <Button asChild variant='ghost'>
        <Link href='/cart'>
          <ShoppingCart /> Cart
        </Link>
      </Button>
      {/* Sign in Button start */}
      <UserButton />
      {/* Sign in Button end */}
    </nav>
    <nav className='md:hidden'>
      {/* Sheet -- Responsive design*/}
      <Sheet>
        <SheetTrigger className='align-middle'>
          <EllipsisVertical />
        </SheetTrigger>
        <SheetContent className='flex flex-col items-start'>
          <SheetTitle>Menu</SheetTitle>
          <ModeToggle />
          <Button asChild variant='ghost'>
            <Link href='/cart'>
              <ShoppingCart /> Cart
            </Link>
          </Button>
          <UserButton />
          <SheetDescription></SheetDescription>
        </SheetContent>
      </Sheet>
    </nav>
  </div>
);

export default Menu;
