import CartTable from './cart-table';
import { getMyCart } from '@/lib/actions';

// Prevents static generation for this route
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shopping Cart',
};

const CartPage = async () => {
  const cart = await getMyCart();

  return (
    <>
      <CartTable cart={cart ?? undefined} />
    </>
  );
};

export default CartPage;
