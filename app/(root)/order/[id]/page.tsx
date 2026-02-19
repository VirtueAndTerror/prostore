import { auth } from '@/auth';
import { getOrderById } from '@/lib/actions';
import type { ShippingAddress } from '@/types';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
  const { id } = await props.params;

  const order = await getOrderById(id);

  if (!order) return notFound();

  const session = await auth();

  return (
    <OrderDetailsTable
      order={{
        ...order,
        shippingAddress: order.shippingAddress as ShippingAddress,
      }}
      paypalClientId={process.env.PAYPAL_CLIENT_ID || 'sb'}
      isAdmin={session?.user.role === 'admin' || false}
    />
  );
};

export default OrderDetailsPage;
