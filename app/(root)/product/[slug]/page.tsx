import ProductPrice from '@/components/shared/product/product-price';
import ProductImages from '@/components/shared/product/product-images';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GetProductBySlug } from '@/lib/actions';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

const ProductDetailsPage = async ({ params }: Props) => {
  const { slug } = await params;

  const product = await GetProductBySlug(slug);
  if (!product) return notFound();

  const {
    name,
    brand,
    category,
    rating,
    numReviews,
    price,
    description,
    stock,
    images,
  } = product;

  const numPrice = Number(price);

  return (
    <section>
      <div className='grid grid-cols-1 md:grid-cols-5'>
        {/* Images Column */}
        <div className='col-span-2'>
          {/* Images Component */}
          <ProductImages images={images} />
        </div>
        {/* Details Column */}
        <div className='col-span-2 p-5'>
          <div className='flex flex-col gap-6'>
            <p>
              {brand} {category}
            </p>
            <h3 className='h3-bold'>{name}</h3>
            <p>
              {rating} of {numReviews}
            </p>
            <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
              <ProductPrice
                value={numPrice}
                className='w-24 rounded-full bg-green-100 text-green-700 px-5 py-2'
              />
            </div>
          </div>
          <div className='mt-10'>
            <p className='font-semibold'>Description</p>
            <p>{description}</p>
          </div>
        </div>
        {/* Action Column */}
        <div>
          <Card>
            <CardContent className='p-4'>
              <div className='mb-2 flex justify-between'>
                <div>Price</div>
                <div>
                  <ProductPrice value={numPrice} />
                </div>
              </div>
              <div className='mb-2 flex justify-between'>
                <div>Status</div>
                {stock > 0 ? (
                  <Badge variant='outline'>In Stock</Badge>
                ) : (
                  <Badge variant='destructive'>Out of Stock</Badge>
                )}
              </div>
              {stock > 0 && <div className='flex-center'></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailsPage;
