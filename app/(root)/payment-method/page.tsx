import CheckoutSteps from '@/components/shared/checkout-steps';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { getUserById } from '@/lib/actions';
import { Metadata } from 'next';
import PaymentMethodForm from './payment-method-form';

export const metadata: Metadata = {
  title: 'Select Payment Method',
};

const PaymentMethodPage = async () => {
  // 1. Check authentication
  const userId = await getAuthenticatedUserId();

  // 2. Fetch user by ID
  const { paymentMethod } = await getUserById(userId);

  // 3. Set current step
  const currentStep = 2;

  return (
    <>
      <CheckoutSteps current={currentStep} />
      <PaymentMethodForm paymentMethod={paymentMethod} />
    </>
  );
};

export default PaymentMethodPage;
