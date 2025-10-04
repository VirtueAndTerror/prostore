// import { Button } from '@/components/ui/button';
import ProductList from '@/components/shared/product/product-list';
import { getLatestProducts } from '@/lib/actions/';

// -- Testing the loading spinner
// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const Homepage = async () => {
  // await delay(2000);
  // return <Button>Button</Button>;

  const latestProducts = await getLatestProducts();

  return <ProductList data={latestProducts} title='Newest Arrivals' />;
};

export default Homepage;
