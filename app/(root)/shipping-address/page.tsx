import { getMyCart, getUserById } from '@/lib/actions';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ShippingAddressForm from './shipping-address-form';
import CheckoutSteps from '@/components/shared/checkout-steps';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export const metadata: Metadata = {
  title: 'Shipping Address',
};

const ShippingAddressPage = async () => {
  // 1. Authentication
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect('/sign-in');

  // 2. Check if cart exists
  const cart = await getMyCart();
  if (!cart?.items?.length) redirect('/cart');

  // 3. Get user's address
  const { address } = await getUserById(userId);

  return (
    <>
      <CheckoutSteps current={1} />
      <ShippingAddressForm address={address} />
    </>
  );
};

export default ShippingAddressPage;
