// import { Button } from '@/components/ui/button';
import ProductList from '@/components/shared/product/product-list';
import ProductCarousel from '@/components/shared/product/product-carousel';
import { getLatestProducts, getFeaturedProducts } from '@/lib/actions/';
import ViewAllProductsButton from '@/components/view-all-products-button';

// -- Testing the loading spinner
// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const Homepage = async () => {
  // await delay(2000);
  // return <Button>Button</Button>;

  const latestProducts = await getLatestProducts();
  const featuredProducts = await getFeaturedProducts();

  return (
    <>
      {featuredProducts.length > 0 && (
        <ProductCarousel data={featuredProducts} />
      )}
      <ProductList products={latestProducts} title='Newest Arrivals' />;
      <ViewAllProductsButton />
    </>
  );
};

export default Homepage;
