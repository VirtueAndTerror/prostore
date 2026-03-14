import { auth } from '@/auth';
import { getOrderById } from '@/lib/actions';
import type { ShippingAddress, PaymentResult } from '@/types';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OrderDetailsTable from './order-details-table';
import Stripe from 'stripe';

export const metadata: Metadata = {
  title: 'Order Details',
};

interface Props {
  params: Promise<{
    id: string;
  }>;
}

const OrderDetailsPage = async (props: Props) => {
  const { id } = await props.params;

  const order = await getOrderById(id);
  if (!order) return notFound();
  const { id: orderId, paymentMethod, isPaid, totalPrice } = order;

  const session = await auth();

  let client_secret = null;

  // Check if not paid and using stripe
  if (paymentMethod === 'STRIPE' && !isPaid) {
    // Initialize Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(totalPrice) * 100),
      currency: 'USD',
      metadata: { orderId },
    });
    client_secret = paymentIntent.client_secret;
  }

  return (
    <OrderDetailsTable
      order={{
        ...order,
        shippingAddress: order.shippingAddress as ShippingAddress,
        paymentResult: order.paymentResult as PaymentResult,
      }}
      stripeClientSecret={client_secret}
      paypalClientId={process.env.PAYPAL_CLIENT_ID || 'sb'}
      isAdmin={session?.user?.role === 'admin'}
    />
  );
};

export default OrderDetailsPage;
