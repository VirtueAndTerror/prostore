import Stripe from 'stripe';
import { getOrderById } from '@/lib/actions';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { serverEnv } from '@/lib/server-env';

const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_intent: string }>;
}

const StripeSuccessPage = async (props: Props) => {
  const { id } = await props.params;
  const { payment_intent } = await props.searchParams;

  // Fetch order
  const order = await getOrderById(id);
  if (!order) return notFound();

  // Retrieve payment intent
  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
  if (!paymentIntent) return notFound();

  // Validate payment intent

  if (
    paymentIntent.metadata.orderId == null ||
    paymentIntent.metadata.orderId !== order.id.toString()
  ) {
    return notFound();
  }

  // Check if payment was successful
  const isSuccess = paymentIntent.status === 'succeeded';
  if (!isSuccess) return redirect(`/order/${id}`);

  return (
    <div className='max-w-4xl w-full mx-auto space-y-8'>
      <div className='flex flex-col gap-6 items-center'>
        <h1 className='h1-bold'>Thanks for your purchse</h1>
        <p>We are processing your order</p>
        <Button asChild>
          <Link href={`/order/${id}`}> View Order</Link>
        </Button>
      </div>
    </div>
  );
};

export default StripeSuccessPage;
