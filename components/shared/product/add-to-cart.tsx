'use client';

import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { addItemToCart, removeItemFromCart } from '@/lib/actions';
import { Cart, CartItem } from '@/types';
import { Minus, Plus, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

interface Props {
  item: CartItem;
  cart?: Cart;
}

const AddToCart = ({ item, cart }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { productId } = item;

  const handleAddItemToCart = useCallback(
    (item: CartItem) => {
      startTransition(async () => {
        const { success, message } = await addItemToCart(item);

        if (!success) {
          toast({
            variant: 'destructive',
            description: message,
          });
          return;
        }

        // Handle success add to cart
        router.refresh();
        toast({
          description: message,
          action: (
            <ToastAction
              className='bg-primary text-white hover:bg-gray-800'
              altText='Go to Cart'
              onClick={() => router.push('/cart')}
            >
              Go To Cart
            </ToastAction>
          ),
        });
      });
    },
    [router, toast]
  );

  // Handle remove from cart
  const handleRemoveItemFromCart = useCallback(
    (productId: string) => {
      startTransition(async () => {
        const { success, message } = await removeItemFromCart(productId);

        toast({
          variant: success ? 'default' : 'destructive',
          description: message,
        });

        return;
      });
    },
    [router, toast]
  );

  // Check if item is in cart
  const itemInCart = cart?.items.find((i) => i.productId === item.productId);
  const { qty } = itemInCart?.qty ? itemInCart : { qty: 0 };

  return itemInCart ? (
    <>
      <Button
        type='button'
        variant='outline'
        onClick={() => handleRemoveItemFromCart(productId)}
      >
        {isPending ? (
          <Loader className='w-4 h-4 animate-spin' />
        ) : (
          <Minus className='h-4 w-4' />
        )}
      </Button>
      {<span className='px-2'>{qty}</span>}
      <Button
        type='button'
        variant='outline'
        onClick={() => handleAddItemToCart(item)}
      >
        {isPending ? (
          <Loader className='w-4 h-4 animate-spin' />
        ) : (
          <Plus className='h-4 w-4' />
        )}
      </Button>
    </>
  ) : (
    <Button
      className='w-full'
      type='button'
      onClick={() => handleAddItemToCart(item)}
    >
      {isPending ? (
        <Loader className='w-4 h-4 animate-spin' />
      ) : (
        <Plus className='h-4 w-4' />
      )}
      Add To Cart
    </Button>
  );
};

export default AddToCart;
