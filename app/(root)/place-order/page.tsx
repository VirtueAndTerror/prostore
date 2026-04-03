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
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { formatPaymentMethod } from '@/lib/constants';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PlaceOrderForm from './place-order-form';

export const metadata: Metadata = {
  title: 'Place Order',
};

const PlaceOrderPage = async () => {
  // 1. Check authentication
  const userId = await getAuthenticatedUserId();

  // 2. Fetch cart
  const cart = await getMyCart();
  if (!cart?.items?.length) redirect('/cart');

  // 3. Fetch user by ID
  const { address, paymentMethod } = await getUserById(userId);
  if (!address) redirect('/shipping-address');
  if (!paymentMethod) redirect('/payment-method');

  const { items, itemsPrice, taxPrice, shippingPrice, totalPrice } = cart;
  const { fullName, streetAddress, city, postalCode, country } = address;

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
              <h2 className='text-xl pb-4'>Payment Method</h2>
              <p>{formatPaymentMethod(paymentMethod)}</p>
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
                  {items.map(({ productId, slug, image, name, qty, price }) => (
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
              <PlaceOrderForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PlaceOrderPage;
