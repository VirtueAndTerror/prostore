import CartTable from './cart-table';
import { getMyCart } from '@/lib/actions';

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
