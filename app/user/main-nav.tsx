'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { title: 'Profile', href: '/user/profile' },
  { title: 'Orders', href: '/user/orders' },
];

interface Props extends React.HTMLAttributes<HTMLDivElement> {}

const MainNav = ({ className, ...props }: Props) => {
  const pathname = usePathname();
  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x6', className)}
      {...props}
    >
      {links.map(({ title, href }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname.includes(href) ? '' : 'text-muted-foreground',
          )}
        >
          {title}
        </Link>
      ))}
    </nav>
  );
};

export default MainNav;
