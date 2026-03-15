'use server';

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import type { Cart, CartItem } from '@/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { convertToPlainObject, formatError, round2Decimals } from '../utils';
import { cartItemsSchema, insertCartSchema } from '../validators';

const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_PRICE = 10;
const TAX_RATE = 0.15;

type CartActionResult = { success: boolean; message: string };

type CartContext = {
  sessionCartId: string | null;
  userId: string | undefined;
};

async function getCartContext(): Promise<CartContext> {
  const cookieStore = await cookies();
  const sessionCartId = cookieStore.get('sessionCartId')?.value ?? null;
  const session = await auth();
  const userId = session?.user?.id;

  return { sessionCartId, userId };
}

function validateStock(product: { stock: number }, requestedQty: number): void {
  if (product.stock < requestedQty) {
    throw new Error('Not enough stock available');
  }
}

const calcPrice = (items: CartItem[]) => {
  const itemsPrice = round2Decimals(
    items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0),
  ),
    shippingPrice = round2Decimals(
      itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICE,
    ),
    taxPrice = round2Decimals(TAX_RATE * itemsPrice),
    totalPrice = round2Decimals(itemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

export const addItemToCart = async (data: CartItem): Promise<CartActionResult> => {
  try {
    const { sessionCartId, userId } = await getCartContext();
    if (!sessionCartId) throw new Error('Cart session not found');

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
      validateStock(product, item.qty);
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
      const itemExistsInCart = cart.items.find((i) => i.productId === item.productId);

      let updatedItems: CartItem[];
      if (itemExistsInCart) {
        validateStock(product, itemExistsInCart.qty + 1);
        updatedItems = cart.items.map((i) =>
          i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i,
        );
      } else {
        validateStock(product, 1);
        updatedItems = [...cart.items, item];
      }

      await prisma.cart.update({
        where: { sessionCartId: cart.sessionCartId },
        data: { items: updatedItems, ...calcPrice(updatedItems) },
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} ${itemExistsInCart ? 'quantity updated in' : 'added to'
          } cart`,
      };
    }
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

export async function getMyCart(): Promise<Cart | null> {
  try {
    const { sessionCartId, userId } = await getCartContext();
    if (!sessionCartId) return null;

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
  } catch (error: unknown) {
    console.error(formatError(error));
    return null;
  }
}

export const removeItemFromCart = async (
  productId: string,
): Promise<CartActionResult> => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: productId },
      select: { slug: true, name: true },
    });

    if (!product) throw new Error('Product not found');

    const cart = await getMyCart();
    if (!cart) throw new Error('Cart not found');

    const itemInCart = cart.items.find((i) => i.productId === productId);
    if (!itemInCart) throw new Error('Item not found');

    const updatedItems: CartItem[] =
      itemInCart.qty === 1
        ? cart.items.filter((i) => i.productId !== productId)
        : cart.items.map((i) =>
          i.productId === productId
            ? { ...i, qty: i.qty - 1 }
            : i,
        );

    await prisma.cart.update({
      where: { sessionCartId: cart.sessionCartId },
      data: {
        items: updatedItems,
        ...calcPrice(updatedItems),
      },
    });

    revalidatePath(`/product/${product.slug}`);

    const message =
      itemInCart.qty === 1
        ? `${product.name} was removed from cart`
        : `${product.name} quantity decreased in cart`;

    return { success: true, message };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};
