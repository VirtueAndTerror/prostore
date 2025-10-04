'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  images: string[];
}

const ProductImages = ({ images }: Props) => {
  const [currentImg, setCurrentImg] = useState(0);
  return (
    <div className='space-y-4'>
      <Image
        src={images[currentImg]}
        alt='product image'
        width={1000}
        height={1000}
        className='min-h-[300px] object-cover object-center'
      />
      <div className='flex'>
        {images.map((img, idx) => (
          <div
            key={img}
            onClick={() => setCurrentImg(idx)}
            className={cn(
              'border mr-2 cursor-pointer hover:border-orange-600',
              currentImg === idx && 'border-orange-500'
            )}
          >
            <Image src={img} alt='image' width={100} height={100} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductImages;
