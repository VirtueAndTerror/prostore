import { auth } from '@/auth';
import AddToCart from '@/components/shared/product/add-to-cart';
import ProductImages from '@/components/shared/product/product-images';
import ProductPrice from '@/components/shared/product/product-price';
import Rating from '@/components/shared/product/rating';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getMyCart, getProductBySlug } from '@/lib/actions';
import { notFound } from 'next/navigation';
import ReviewList from './review-list';

interface Props {
  params: Promise<{ slug: string }>;
}

const ProductDetailsPage = async ({ params }: Props) => {
  // 1. Get slug from params
  const { slug } = await params;

  // 2. Fetch product, cart, and session in parallel
  const [product, cart, session] = await Promise.all([
    getProductBySlug(slug),
    getMyCart(),
    auth(),
  ]);

  // 3. Handle not found product
  if (!product) return notFound();

  // 4. Get user ID from session (will be undefined if not logged in)
  const userId = session?.user?.id;

  const {
    id,
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

  return (
    <>
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
              <Rating value={Number(rating)} />
              <p>{numReviews} Reviews</p>
              <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
                <ProductPrice
                  price={price}
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
                    <ProductPrice price={price} />
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
                {stock > 0 && (
                  <div className='flex-center'>
                    <AddToCart
                      cart={cart ?? undefined}
                      item={{
                        productId: id,
                        name,
                        slug,
                        price,
                        qty: 1,
                        image: images[0],
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <section className='mt-10'>
        <ReviewList userId={userId ?? ''} productId={id} slug={slug} />
      </section>
    </>
  );
};

export default ProductDetailsPage;
