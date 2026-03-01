'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Product } from '@/types';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
  data: Product[];
}

const ProductCarousel = ({ data }: Props) => {
  return (
    <Carousel
      className='w-full mb-12'
      opts={{ loop: true }}
      plugins={[
        Autoplay({
          delay: 10000, // 10s
          stopOnInteraction: true,
          stopOnMouseEnter: true,
        }),
      ]}
    >
      <CarouselContent>
        {data.map(({ id, slug, banner, name }) => (
          <CarouselItem key={id}>
            <Link href={`/product/${slug}`}>
              <div className='relative mx-auto'>
                <Image
                  src={banner!}
                  alt={name}
                  height={'0'}
                  width={'0'}
                  sizes={'100vw'}
                  className='w-full h-auto'
                />
                <div className='absolute inset-0 flex items-end justify-center'>
                  <h2 className='bg-gray-900 bg-opacity-50 text-2xl font-bold px-2 text-white'>
                    {name}
                  </h2>
                </div>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default ProductCarousel;
