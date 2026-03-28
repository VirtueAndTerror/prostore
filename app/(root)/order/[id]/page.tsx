import { auth } from '@/auth';
import { getOrderById } from '@/lib/actions';
import type { PaymentResult, ShippingAddress } from '@/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Stripe from 'stripe';
import OrderDetailsTable from './order-details-table';

export const metadata: Metadata = {
  title: 'Order Details',
};

interface Props {
  params: Promise<{
    id: string;
  }>;
}

const OrderDetailsPage = async (props: Props) => {
  // 1. Check authentication
  const session = await auth();
  // 2. Await params to get order ID
  const { id } = await props.params;
  // 3. Fetch order by ID
  const order = await getOrderById(id);
  if (!order) return notFound();

  const { id: orderId, paymentMethod, isPaid, totalPrice } = order;


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
