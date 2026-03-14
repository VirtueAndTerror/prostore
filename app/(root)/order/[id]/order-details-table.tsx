'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { formatCurrency, formatDateTime, formatId } from '@/lib';
import type { Order } from '@/types';
import {
  PayPalProvider,
  PayPalOneTimePaymentButton,
} from '@paypal/react-paypal-js/sdk-v6';

import Image from 'next/image';
import Link from 'next/link';

import {
  approvePayPalOrder,
  createPayPalOrder,
  deliverOrder,
  updateCODToPaid,
} from '@/lib/actions';

import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import StripePayment from './stripe-payment';
import { formatPaymentMethod } from '@/lib/constants';

interface Props {
  order: Order;
  paypalClientId: string;
  stripeClientSecret: string | null;
  isAdmin: boolean;
}

const OrderDetailsTable = ({
  order,
  paypalClientId,
  stripeClientSecret,
  isAdmin,
}: Props) => {
  const { toast } = useToast();
  const {
    id,
    shippingAddress,
    orderItems,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    paymentMethod,
    isDelivered,
    isPaid,
    paidAt,
    deliveredAt,
  } = order;

  const { fullName, streetAddress, city, postalCode, country } =
    shippingAddress;

  // const printLoadingState = () => {
  //   const [{ isPending, isRejected }] = usePayPalScriptReducer();
  //   let status = '';

  //   if (isPending) {
  //     status = 'Loading PayPal...';
  //   } else if (isRejected) {
  //     status = 'Failed to load PayPal';
  //   }

  //   return status;
  // };

  const handleCreatePayPalOrder = async () => {
    const { success, message, orderId } = await createPayPalOrder(order.id);

    if (!success || !orderId) {
      toast({
        variant: 'destructive',
        description: message,
      });
      throw new Error(message);
    }

    return { orderId };
  };

  const handleApprovePayPalOrder = async (data: { orderId: string }) => {
    const { success, message } = await approvePayPalOrder(order.id, {
      orderID: data.orderId,
    });

    toast({
      variant: success ? 'default' : 'destructive',
      description: message,
    });
  };

  // Button to mark order as paid
  const MarkAsPaidButton = () => {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    return (
      <Button
        type='button'
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const { success, message } = await updateCODToPaid(id);

            toast({
              variant: success ? 'default' : 'destructive',
              description: message,
            });
          })
        }
      >
        {isPending ? 'processing...' : 'Mark As Paid'}
      </Button>
    );
  };
  const MarkAsDeliveredButton = () => {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    return (
      <Button
        type='button'
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const { success, message } = await deliverOrder(id);

            toast({
              variant: success ? 'default' : 'destructive',
              description: message,
            });
          })
        }
      >
        {isPending ? 'processing...' : 'Mark As Delivered'}
      </Button>
    );
  };

  return (
    <>
      <h1 className='py-4 text-2xl'>Order# ending in: {formatId(id)}</h1>
      <div className='grid md:grid-cols-3 md:gap-5'>
        <div className='col-span-2 space-4-y overflow-x-auto'>
          <Card className='mb-4'>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>Payment Method</h2>
              <p>{formatPaymentMethod(paymentMethod)}</p>
              {isPaid ? (
                <Badge variant={'secondary'}>
                  Paid at {formatDateTime(paidAt!).dateTime}
                </Badge>
              ) : (
                <Badge variant={'destructive'}>Not Paid</Badge>
              )}
            </CardContent>
          </Card>
          <Card className='mb-4'>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>Shipping Address</h2>
              <p>{fullName}</p>
              <p>
                {streetAddress}, {city}
              </p>
              <p>
                {postalCode}, {country}
              </p>
              {isDelivered ? (
                <Badge variant={'secondary'}>
                  Delivered at {formatDateTime(deliveredAt!).dateTime}
                </Badge>
              ) : (
                <Badge variant={'destructive'}>Not Delivered</Badge>
              )}
            </CardContent>
          </Card>
          <Card className='my-2'>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>Order Items</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map(({ image, name, qty, price, slug }) => (
                    <TableRow key={slug}>
                      <TableCell>
                        <Link
                          href={`/product/{slug}`}
                          className='flex items-center'
                        >
                          <Image
                            src={image}
                            alt={name}
                            width={50}
                            height={50}
                          />
                          <span className='px-2'>{name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className='px-2'>{qty}</span>
                      </TableCell>
                      <TableCell>
                        <span className='px-2'>${price}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className='p-4 gap-4 space-y-4'>
              <div className='flex justify-between'>
                <div>Items</div>
                <div>{formatCurrency(itemsPrice)}</div>
              </div>
              <div className='flex justify-between'>
                <div>Tax</div>
                <div>{formatCurrency(taxPrice)}</div>
              </div>
              <div className='flex justify-between'>
                <div>Shipping</div>
                <div>{formatCurrency(shippingPrice)}</div>
              </div>
              <div className='flex justify-between'>
                <div>Total</div>
                <div>{formatCurrency(totalPrice)}</div>
              </div>
              {/* PayPal Payment */}
              {!isPaid && paymentMethod === 'PAYPAL' && (
                <div>
                  <PayPalProvider
                    clientId={paypalClientId}
                    pageType='checkout'
                    components={['paypal-payments']}
                  >
                    <PayPalOneTimePaymentButton
                      presentationMode='auto'
                      createOrder={handleCreatePayPalOrder}
                      onApprove={handleApprovePayPalOrder}
                      onError={(data) => console.error(data)}
                    />
                  </PayPalProvider>
                </div>
              )}

              {/* Stripe Payment */}
              {!isPaid && paymentMethod === 'STRIPE' && stripeClientSecret && (
                <StripePayment
                  orderId={id}
                  priceInCents={Number(totalPrice) * 100}
                  clientSecret={stripeClientSecret}
                />
              )}

              {/* Cash On Delivery */}
              {isAdmin && !isPaid && paymentMethod === 'CASH_ON_DELIVERY' && (
                <MarkAsPaidButton />
              )}
              {isAdmin && isPaid && !isDelivered && <MarkAsDeliveredButton />}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsTable;
