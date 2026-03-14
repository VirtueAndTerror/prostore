import ProductCarousel from '@/components/shared/product/product-carousel';
import ProductList from '@/components/shared/product/product-list';
import ViewAllProductsButton from '@/components/view-all-products-button';
import { getFeaturedProducts, getLatestProducts } from '@/lib/actions/';
import IconBoxes from '@/components/icon-boxes';
import DealCountdown from '@/components/deal-countdown';

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
      <DealCountdown />
      <IconBoxes />
    </>
  );
};

export default Homepage;
