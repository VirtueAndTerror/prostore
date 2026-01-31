import { auth } from '@/auth';
import CheckoutSteps from '@/components/shared/checkout-steps';
import { getUserById } from '@/lib/actions';
import { Metadata } from 'next';
import PaymentMethodForm from './payment-method-form';

export const metadata: Metadata = {
  title: 'Select Payment Method',
};

const PaymentMethodPage = async () => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) throw new Error('User Not Found');

  const { paymentMethod } = await getUserById(userId);

  return (
    <>
      <CheckoutSteps current={2} />
      <PaymentMethodForm paymentMethod={paymentMethod} />
    </>
  );
};

export default PaymentMethodPage;
