import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProductFromDB } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import ProductPrice from './product-price';

interface Props {
  product: ProductFromDB;
}

const ProductCard = ({ product }: Props) => {
  const { slug, images, name, brand, rating, stock, price } = product;

  return (
    <Card className='w-full  max-w-sm'>
      <CardHeader className='p-0 items-center'>
        <Link href={`/product/${slug}`}>
          <Image src={images[0]} alt={name} height={300} width={300} />
        </Link>
      </CardHeader>
      <CardContent className='p-4, grid gap-4'>
        <div className='text-tx'>{brand}</div>
        <Link href={`/product/${slug}`}>
          <h2 className='text-sm font-medium'>{name} </h2>
        </Link>
        <div className='flex-between gap-4'>
          <p>{rating} Stars</p>
          {stock > 0 ? (
            <ProductPrice price={price}></ProductPrice>
          ) : (
            <p className='text-destructive'> Out Of Stock</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
export default ProductCard;
