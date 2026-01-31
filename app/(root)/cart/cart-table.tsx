'use client';
import { Cart, CartItem } from '@/types';
import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addItemToCart, removeItemFromCart } from '@/lib/actions';
import { ArrowRight, Loader, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
  TableHeader,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib';

interface Props {
  cart?: Cart;
}

const CartTable = ({ cart }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleRemoveItem = useCallback(
    (productId: string) => {
      startTransition(async () => {
        try {
          const { success, message } = await removeItemFromCart(productId);
          if (!success) {
            toast({ variant: 'destructive', description: message });
          } else {
            router.refresh();
          }
        } catch (err) {
          toast({
            variant: 'destructive',
            description: 'Filed to remove item',
          });
        }
      });
    },
    [router, toast]
  );

  const handleAddItem = useCallback(
    (item: CartItem) => {
      startTransition(async () => {
        try {
          const { success, message } = await addItemToCart(item);
          if (!success) {
            toast({ variant: 'destructive', description: message });
          } else {
            router.refresh();
          }
        } catch (err) {
          toast({ variant: 'destructive', description: 'Failed to add item' });
        }
      });
    },
    [router, toast]
  );

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <h1 className='py-4 h2-bold'>Shopping Cart</h1>
        <div>
          Cart is empty. <Link href='/'>Go Shopping</Link>
        </div>
      </>
    );
  }
  const { items, itemsPrice } = cart;

  return (
    <>
      <h1 className='py-4 h2-bold'>Shopping Cart</h1>
      <div className='grid md:grid-cols-4 md:gap-5'>
        <div className='overflow-x-auto md:col-span-3'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className='text-center'>Quantity</TableHead>
                <TableHead className='text-center'>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const { slug, image, name, productId, qty, price } = item;
                const key = productId ?? slug;
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <Link
                        href={`/product/${slug}`}
                        className='flex items-center'
                      >
                        <Image src={image} alt={name} width={50} height={50} />
                        <span className='px-2'>{name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className='flex-center gap-2'>
                      <Button
                        type='button'
                        disabled={isPending}
                        variant='outline'
                        aria-label={`Take one ${name} out of the shopping cart`}
                        onClick={() => handleRemoveItem(productId)}
                      >
                        {isPending ? (
                          <Loader className='w-4 h-4 animate-spin' />
                        ) : (
                          <Minus className='w-4 h-4' />
                        )}
                      </Button>
                      <span>{qty}</span>
                      <Button
                        type='button'
                        disabled={isPending}
                        variant='outline'
                        aria-label={`Add one more ${name} to the shopping cart`}
                        onClick={() => handleAddItem(item)}
                      >
                        {isPending ? (
                          <Loader className='w-4 h-4 animate-spin' />
                        ) : (
                          <Plus className='w-4 h-4' />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className='text-right'>${price}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <Card>
          <CardContent className='p-4 gap-4'>
            <div className='pb-3 text-xl'>
              Subtotal ({items.reduce((acc, item) => acc + item.qty, 0)}):
              <span className='font-bold'>{formatCurrency(itemsPrice)}</span>
            </div>
            <Button
              className='w-full'
              disabled={isPending}
              onClick={() => {
                startTransition(() => router.push('/shipping-address'));
              }}
            >
              {isPending ? (
                <Loader className='w-4 h-4' />
              ) : (
                <ArrowRight className='w-4 h-4' />
              )}
              Proceed to Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CartTable;
