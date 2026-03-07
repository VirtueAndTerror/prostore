import { auth } from '@/auth';
import CheckoutSteps from '@/components/shared/checkout-steps';
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
import { formatCurrency } from '@/lib';
import { getMyCart, getUserById } from '@/lib/actions';
import type { ShippingAddress } from '@/types';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import PlaceOrderForm from './place-order-form';

export const metadata: Metadata = {
  title: 'Place Order',
};

const PlaceOrderpage = async () => {
  const cart = await getMyCart();
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) throw new Error('User not found');
  const { address, paymentMethod } = await getUserById(userId);

  if (!cart || cart.items.length === 0) redirect('/cart');
  if (!address) redirect('/shipping-address');
  if (!paymentMethod) redirect('/payment-method');

  const { fullName, streetAddress, city, postalCode, country } =
    address as ShippingAddress;

  return (
    <>
      <CheckoutSteps current={3} />
      <h1 className='py-4 text-2x1'>Place Order</h1>
      <div className='grid md:grid-cols-3 md:gap-5'>
        <div className='md:col-span-2 overflow-x-auto space-y-4'>
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>Shipping Address</h2>
              <p>{fullName}</p>
              <p>
                {streetAddress}, {city}{' '}
              </p>
              <p>
                {postalCode}, {country}{' '}
              </p>
              <div className='mt-3'>
                <Link href='/shipping-address'>
                  <Button variant='outline'>Edit</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>Shipping Address</h2>
              <p>{paymentMethod}</p>
              <div className='mt-3'>
                <Link href='/payment-method'>
                  <Button variant='outline'>Edit</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>Order Summary</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.items.map(
                    ({ productId, slug, image, name, qty, price }) => (
                      <TableRow key={productId}>
                        <TableCell>
                          <Link
                            href={`/product/${slug}`}
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
                        <TableCell className='px-2'>
                          <span>{qty}</span>
                        </TableCell>
                        <TableCell className='px-2'>
                          <span>{price}</span>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
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
                <div>{formatCurrency(cart.itemsPrice)}</div>
              </div>
              <div className='flex justify-between'>
                <div>Tax</div>
                <div>{formatCurrency(cart.taxPrice)}</div>
              </div>
              <div className='flex justify-between'>
                <div>Shipping</div>
                <div>{formatCurrency(cart.shippingPrice)}</div>
              </div>
              <div className='flex justify-between'>
                <div>Total</div>
                <div>{formatCurrency(cart.totalPrice)}</div>
              </div>
              <PlaceOrderForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PlaceOrderpage;
