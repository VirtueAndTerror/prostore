'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../ui/button';
import { buildUrlQuery } from '@/lib';

interface Props {
  page: number | string;
  totalPages: number;
  urlParamName?: string;
}

const Pagination = ({ page, totalPages, urlParamName }: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = (btnType: string) => {
    const value = (
      btnType === 'next' ? Number(page) + 1 : Number(page) - 1
    ).toString();
    const newUrl = buildUrlQuery({
      params: searchParams.toString(),
      key: urlParamName || 'page',
      value,
    });

    router.push(newUrl);
  };

  return (
    <div className='flex gap-2'>
      <Button
        size='lg'
        variant={'outline'}
        className='w-28'
        disabled={Number(page) <= 1}
        onClick={() => handleClick('prev')}
      >
        Previous
      </Button>

      <Button
        size='lg'
        variant={'outline'}
        className='w-28'
        disabled={Number(page) >= totalPages}
        onClick={() => handleClick('next')}
      >
        Next
      </Button>
    </div>
  );
};

export default Pagination;
