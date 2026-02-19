import { APP_NAME } from '@/lib/constants';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='border-t py-8'>
      <div className='mx-auto max-w-7xl px-4'>
        <div className='flex flex-col items-center justify-center gap-4 text-center'>
          <p className='text-sm text-muted-foreground'>
            © {currentYear} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
