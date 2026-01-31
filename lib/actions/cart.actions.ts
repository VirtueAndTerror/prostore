'use server';

import { cookies } from 'next/headers';
import { Cart, CartItem } from '@/types';
import { convertToPlainObject, formatError, round2Decimals } from '../utils';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { cartItemsSchema, insertCartSchema } from '../validators';
import { revalidatePath } from 'next/cache';

const calcPrice = (items: CartItem[]) => {
  const itemsPrice = round2Decimals(
      items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    // Free shipping for orders over $100
    shippingPrice = round2Decimals(itemsPrice > 100 ? 0 : 10),
    taxPrice = round2Decimals(0.15 * itemsPrice),
    totalPrice = round2Decimals(itemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

export const addItemToCart = async (data: CartItem) => {
  try {
    // Check for the cart cookie
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;
    if (!sessionCartId) throw new Error('Cart session not found');

    // Get session and user ID
    const session = await auth();
    const userId = session?.user?.id;

    // Get cart
    const cart = await getMyCart();

    // Parse and validate item
    const item = cartItemsSchema.parse(data);

    // Find product in database
    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    });

    if (!product) throw new Error('Product not found');

    if (!cart) {
      // Create new cart object
      const newCart = insertCartSchema.parse({
        userId,
        sessionCartId,
        items: [item],
        ...calcPrice([item]),
      });

      // Add to database
      await prisma.cart.create({ data: newCart });

      // Revalidate product page
      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} added to cart`,
      };
    } else {
      // update existing cart
      const existItem = cart.items.find((i) => i.productId === item.productId);

      if (existItem) {
        // Check stock
        if (existItem.qty + 1 > product.stock) {
          throw new Error('No enought stock available');
        }

        // Increase the qty
        cart.items.find((i) => i.productId === item.productId)!.qty =
          existItem.qty + 1;
      } else {
        // If item does not exist in cart
        // Check stock
        if (product.stock < 1) throw new Error('No enought stock available');

        // Add item to the cart.items
        cart.items.push(item);
      }

      await prisma.cart.update({
        where: { sessionCartId: cart.sessionCartId },
        data: { items: cart.items, ...calcPrice(cart.items) },
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} ${
          existItem ? 'quantity updated in' : 'added to'
        } cart`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

/* TODO - REFACTOR*/

export const getMyCart = async (): Promise<Cart | null> => {
  // Check for the cart cookie
  const sessionCartId = (await cookies()).get('sessionCartId')?.value;
  if (!sessionCartId) throw new Error('Cart session not found');

  // Get session and user ID
  const session = await auth();
  const userId = session?.user?.id;

  const cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionCartId },
  });

  if (!cart) return null;

  // Convert decimals and return
  return convertToPlainObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
  });
};

export const removeItemFromCart = async (productId: string) => {
  try {
    // Get Product
    const product = await prisma.product.findFirst({
      where: { id: productId },
    });

    if (!product) throw new Error('Product not found');

    // Get user's cart
    const cart = await getMyCart();
    if (!cart) throw new Error('Cart not found');

    // Check for item in cart
    const itemInCart = cart.items.find((i) => i.productId === productId);
    if (!itemInCart) throw new Error('Item not found');

    // Check if there is only one in qty
    if (itemInCart.qty === 1) {
      // Remove form cart
      // Returns an array with all items that don't match the productId
      cart.items = cart.items.filter(
        (i) => i.productId !== itemInCart.productId
      );
    } else {
      // Decrease qty
      const foundProduct = cart.items.find((i) => i.productId === productId);
      if (foundProduct) {
        foundProduct.qty = itemInCart.qty - 1;
      }
    }

    // Update cart in database
    await prisma.cart.update({
      where: { sessionCartId: cart.sessionCartId },
      data: {
        items: cart.items,
        ...calcPrice(cart.items),
      },
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `${product.name} was removed from cart`,
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};
