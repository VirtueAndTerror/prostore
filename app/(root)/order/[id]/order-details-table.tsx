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
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';

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

interface Props {
  order: Order;
  paypalClientId: string;
  isAdmin: boolean;
}

const OrderDetailsTable = ({ order, paypalClientId, isAdmin }: Props) => {
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

  const printLoadingState = () => {
    const [{ isPending, isRejected }] = usePayPalScriptReducer();
    let status = '';

    if (isPending) {
      status = 'Loading PayPal...';
    } else if (isRejected) {
      status = 'Failed to load PayPal';
    }

    return status;
  };

  const handleCreatePayPalOrder = async () => {
    const { success, message, data } = await createPayPalOrder(order.id);

    if (!success || !data) {
      toast({
        variant: 'destructive',
        description: message,
      });
      return '';
    }

    return data;
  };

  const handleApprovePayPalOrder = async (data: { orderID: string }) => {
    const { success, message } = await approvePayPalOrder(order.id, data);

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
              <p>{paymentMethod}</p>
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
              {!isPaid && paymentMethod === 'PayPal' && (
                <div>
                  <PayPalScriptProvider options={{ clientId: paypalClientId }}>
                    <PayPalButtons
                      createOrder={handleCreatePayPalOrder}
                      onApprove={handleApprovePayPalOrder}
                    />
                  </PayPalScriptProvider>
                </div>
              )}

              {/* Cash On Delivery */}
              {isAdmin && !isPaid && paymentMethod === 'CashOnDelivery' && (
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
