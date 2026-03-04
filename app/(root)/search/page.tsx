import ProductCard from '@/components/shared/product/product-card';
import { Button } from '@/components/ui/button';
import { isActive } from '@/lib';
import { getAllCategories, getAllProducts } from '@/lib/actions';
import { PRICES_OPTS, RATINGS_OPTS, SORT_OPTS } from '@/lib/constants';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{
    query?: string;
    category?: string;
    price?: string;
    rating?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props) {
  const {
    query = 'all',
    category = 'all',
    price = 'all',
    rating = 'all',
  } = await searchParams;

  const isQuerySet = isActive(query);
  const isCategorySet = isActive(category);
  const isPriceSet = isActive(price);
  const isRatingSet = isActive(rating);

  if (isQuerySet || isCategorySet || isPriceSet || isRatingSet) {
    return {
      title: `
      Search ${isQuerySet ? query : ''} 
      ${isCategorySet ? `: Category ${category}` : ''}
      ${isPriceSet ? `: Price ${price}` : ''}
      ${isRatingSet ? `: Rating ${rating}` : ''}`,
    };
  } else {
    return {
      title: 'Search Products',
    };
  }
}

const SearchPage = async ({ searchParams }: Props) => {
  const {
    query = 'all',
    category = 'all',
    price = 'all',
    rating = 'all',
    sort = 'newest',
    page = '1',
  } = await searchParams;

  // Build Filter Url
  const getFilterUrl = (
    overrides: Partial<{
      query: string;
      category: string;
      price: string;
      rating: string;
      sort: string;
      page: string;
    }> = {},
  ) => {
    const params = { query, category, price, rating, sort, page, ...overrides };
    return `/search?${new URLSearchParams(params).toString()}`;
  };

  const [{ data: products }, categories] = await Promise.all([
    getAllProducts({
      query,
      category,
      price,
      rating,
      sort,
      page: Number(page),
    }),
    getAllCategories(),
  ]);

  return (
    <div className='grid md:grid-cols-5 md:gap-5'>
      <div className='filter-links'>
        {/* Category Links*/}
        <div className='text-xl mb-2 mt-3'>Department</div>
        <div>
          <ul className='space-y-1'>
            <li>
              <Link
                className={`${(category === 'all' || category === '') && 'font-bold'}`}
                href={getFilterUrl({ category: 'all' })}
              >
                Any
              </Link>
            </li>
            {categories.map((x) => (
              <li key={x.category}>
                <Link
                  className={`${category === x.category && 'font-bold'}`}
                  href={getFilterUrl({ category: x.category })}
                >
                  {x.category}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* Price Links*/}
        <div className='text-xl mb-2 mt-8'>Price</div>
        <div>
          <ul className='space-y-1'>
            <li>
              <Link
                className={`${price === 'all' && 'font-bold'}`}
                href={getFilterUrl({ price: 'all' })}
              >
                Any
              </Link>
            </li>
            {PRICES_OPTS.map((priceOption) => (
              <li key={priceOption.value}>
                <Link
                  className={`${price === priceOption.value && 'font-bold'}`}
                  href={getFilterUrl({ price: priceOption.value })}
                >
                  {priceOption.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* Ratings Links*/}
        <div className='text-xl mb-2 mt-8'>Ratings</div>
        <div>
          <ul className='space-y-1'>
            <li>
              <Link
                className={`${rating === 'all' && 'font-bold'}`}
                href={getFilterUrl({ rating: 'all' })}
              >
                Any
              </Link>
            </li>
            {RATINGS_OPTS.map((ratingOption) => (
              <li key={ratingOption}>
                <Link
                  className={`${rating === ratingOption.toString() && 'font-bold'}`}
                  href={getFilterUrl({ rating: `${ratingOption}` })}
                >
                  {`${ratingOption} stars & up`}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className='md:col-span-4 space-y-4'>
        <div className='flex-between flex-col md:flex-row my-4'>
          <div className='flex items-center'>
            {isActive(query) && 'Query: ' + query}
            {isActive(category) && ' Category: ' + category}
            {isActive(price) && ' Price: ' + price}
            {isActive(rating) && ' Rating: ' + rating + ' stars & up'}
            &nbsp;
            {isActive(query) ||
            isActive(category) ||
            isActive(rating) ||
            isActive(price) ? (
              <Button variant={'link'} asChild>
                <Link href={'/search'}>Clear</Link>
              </Button>
            ) : null}
          </div>
          <div>
            Sort by{' '}
            {SORT_OPTS.map((sortOption) => (
              <Link
                key={sortOption}
                href={getFilterUrl({ sort: sortOption })}
                className={`mx-2 ${sort === sortOption && 'font-bold'}`}
              >
                {' '}
                {sortOption}
              </Link>
            ))}
          </div>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {!products || products.length === 0 ? (
            <p>No products found</p>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
