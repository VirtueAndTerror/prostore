'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  images: string[];
  alt?: string;
}

const ProductImages = ({ images = [], alt = 'Product Image' }: Props) => {
  const [currentImg, setCurrentImg] = useState(0);

  return (
    <div className='space-y-4'>
      <Image
        src={images[currentImg]}
        alt={alt}
        width={1000}
        height={1000}
        className='min-h-[300px] object-cover object-center'
        priority
      />
      <div className='flex'>
        {images.map((img, idx) => {
          const selectedImg = idx === currentImg;
          return (
            <div
              key={img}
              onClick={() => setCurrentImg(idx)}
              className={cn(
                'border mr-2 cursor-pointer hover:border-orange-600',
                selectedImg && 'border-orange-500'
              )}
              aria-pressed={selectedImg}
              aria-label={`Show image ${idx + 1}`}
            >
              <Image
                src={img}
                alt={`${alt} thumbnail`}
                width={100}
                height={100}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductImages;
