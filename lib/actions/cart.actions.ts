'use server';

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import type { Cart, CartItem } from '@/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { DEFAULT_PRICING_CONFIG } from '../constants';
import { convertToPlainObject, formatError } from '../utils';
import { cartItemsSchema } from '../validators';

// ----- Types -----
type CartActionResult = { success: boolean; message: string };

type PricingConfig = {
  freeShippingThresholdCents: number;
  shippingFlatRateCents: number;
  taxRateBase: number;
};

type CartContext = {
  sessionCartId: string | null;
  userId: string | undefined;
};

// ----- Helpers -----

/** Reads the sessionCartId cookie and the current auth session in one call. */
async function getCartContext(): Promise<CartContext> {
  const cookieStore = await cookies();
  const sessionCartId = cookieStore.get('sessionCartId')?.value ?? null;
  const session = await auth();

  return { sessionCartId, userId: session?.user?.id };
}
/** Throws if the product does not have enough stock for the requested quantity. */
function validateStock(product: { stock: number }, requestedQty: number): void {
  if (product.stock < requestedQty) {
    throw new Error('Not enough stock available');
  }
}

/**
 * Derives cart price totals from an array of cart items.
 * Shipping is free when the items subtotal exceeds FREE_SHIPPING_THRESHOLD.
 * All values are returned as fixed-2-decimal strings for consistent serialisation.
 */
function calcPrice(items: CartItem[], config: PricingConfig) {
  // 1 . Calculate the subtotal in CENTS
  const itemsPriceCents = items.reduce((acc, item) => {
    const itemCents = Math.round(Number(item.price) * 100);
    return acc + (itemCents * item.qty)
  }, 0);

  // 2. Calculate Shipping in CENTS base on threshold
  const shippingPriceCents = itemsPriceCents > config.freeShippingThresholdCents ? 0 : config.shippingFlatRateCents;

  // 3. Calculate Tax in CENTS
  const taxPriceCents = Math.round(itemsPriceCents * config.taxRateBase);

  // 4. Calculate Total in CENTS
  const totalPriceCents = itemsPriceCents + shippingPriceCents + taxPriceCents;

  // 5. Convert back to decimal strings for Prisma/Responses
  return {
    itemsPrice: (itemsPriceCents / 100).toFixed(2),
    taxPrice: (taxPriceCents / 100).toFixed(2),
    shippingPrice: (shippingPriceCents / 100).toFixed(2),
    totalPrice: (totalPriceCents / 100).toFixed(2),
  };
}

export const addItemToCart = async (
  data: CartItem,
): Promise<CartActionResult> => {
  try {
    const { sessionCartId, userId } = await getCartContext();
    if (!sessionCartId) throw new Error('Cart session not found');

    const item = cartItemsSchema.parse(data);

    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    });

    if (!product) throw new Error('Product not found');

    const existingCart = await getMyCart();

    let cartId: string;

    // Check if cart exists, otherwise create a new one
    if (!existingCart) {
      const newCart = await prisma.cart.create({
        data: {
          sessionCartId,
          userId,
          itemsPrice: 0,
          shippingPrice: 0,
          taxPrice: 0,
          totalPrice: 0,
        },
      });
      cartId = newCart.id;
    } else {
      cartId = existingCart.id as string;
    }

    // Check current stock before adding/updating
    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId: item.productId } }, // ← CartItem model
    });

    const requestedQty = existingItem ? existingItem.qty + 1 : 1;
    validateStock(product, requestedQty);

    //  CONCURRENCY-SAFE UPSERT ← MUST be on CartItem
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId: item.productId } }, // ← CartItem
      update: { qty: { increment: 1 } },
      create: {
        cartId,
        productId: item.productId,
        qty: 1,
        price: item.price,
        name: item.name,
        slug: item.slug,
        image: item.image,
      },
    });


    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `${product.name} ${existingItem ? 'quantity updated in' : 'added to'
        } cart`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

export async function mergeGuestCartIntoUserCart(userId: string) {
  try {
    const cookieStore = await cookies();
    const sessionCartId = cookieStore.get('sessionCartId')?.value;
    if (!sessionCartId) return;

    const guestCart = await prisma.cart.findUnique({
      where: { sessionCartId },
      include: { items: true },
    });

    if (!guestCart || guestCart.userId) return; // not a guest cart

    const userCart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: true },
    });

    if (!userCart) {
      await prisma.cart.update({
        where: { id: guestCart.id },
        data: { userId },
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const guestItem of guestCart.items) {
        await tx.cartItem.upsert({
          where: {
            cartId_productId: {
              cartId: userCart.id,
              productId: guestItem.productId,
            },
          },
          update: { qty: { increment: guestItem.qty } },
          create: {
            cartId: userCart.id,
            productId: guestItem.productId,
            qty: guestItem.qty,
            price: guestItem.price,
            name: guestItem.name,
            slug: guestItem.slug,
            image: guestItem.image,
          },
        });
      }


      await tx.cart.delete({ where: { id: guestCart.id } });
    });
  } catch (err) {
    console.error('Error merging carts:', err);
  }
}


export async function getMyCart(): Promise<Cart | null> {
  try {
    const { sessionCartId, userId } = await getCartContext();

    let cart = sessionCartId
      ? await prisma.cart.findUnique({
        where: { sessionCartId },
        include: { items: true },
      })
      : null;

    // If no cart is found by session ID (e.g., after a guest cart was merged)
    // and the user is logged in, try to find their persistent cart using their user ID.
    if (!cart && userId) {
      cart = await prisma.cart.findFirst({
        where: { userId },
        include: { items: true },
      });
    }

    if (!cart) return null;

    // Calculate totals dynamically for the response
    const formattedItems = cart.items.map((item) => ({
      ...item,
      price: item.price.toString(),
    })) as CartItem[];

    const priceData = calcPrice(formattedItems, DEFAULT_PRICING_CONFIG);

    // Convert Decimal types to strings for client-side compatibility
    return convertToPlainObject({
      ...cart,
      items: formattedItems,
      ...priceData,
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

    const cartId = cart.id as string;

    // If qty is 1, remove item. Otherwise, decrement qty.
    if (itemInCart.qty === 1) {
      await prisma.cartItem.delete({
        where: { cartId_productId: { cartId, productId } }, // ← CartItem
      });
    } else {
      await prisma.cartItem.update({
        where: { cartId_productId: { cartId, productId } }, // ← CartItem
        data: { qty: { decrement: 1 } },
      });
    }


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
