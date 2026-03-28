'use server';

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import type { Cart, CartItem } from '@/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { convertToPlainObject, formatError } from '../utils';
import { cartItemsSchema } from '../validators';
import { DEFAULT_PRICING_CONFIG } from '../constants';

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

    // Recalculate cart totals after item update
    const cartItemsDb = await prisma.cartItem.findMany({ where: { cartId } });
    const priceData = calcPrice(
      cartItemsDb.map((ci) => ({
        ...ci,
        price: ci.price.toString(),
      })) as CartItem[],
      DEFAULT_PRICING_CONFIG
    );

    await prisma.cart.update({
      where: { id: cartId },
      data: { ...priceData },
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

    // If user is logged in and the current session cart is a guest cart (no userId associated)
    if (userId && cart && !cart.userId) {
      // Check if the user already has a saved cart in the database
      let userCart = await prisma.cart.findFirst({
        where: { userId },
        include: { items: true },
      });

      if (!userCart) {
        // Scenario 1: User has no saved cart, so we just claim the guest cart
        await prisma.cart.update({
          where: { id: cart.id },
          data: { userId },
        });
      } else {
        // Scenario 2: User has a saved cart. Merge guest cart items into user cart.
        const guestCart = cart;
        await prisma.$transaction(async (tx) => {
          // 1. Transfer guest items to user cart (update qty if exists, create if not)
          for (const guestItem of guestCart.items) {
            await tx.cartItem.upsert({
              where: {
                cartId_productId: {
                  cartId: userCart.id,
                  productId: guestItem.productId,
                },
              }, // ← CartItem
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

          // 2. Recalculate totals for the user cart
          const mergedItemsForCalc = await tx.cartItem.findMany({
            where: { cartId: userCart.id },
          });
          const newCalc = calcPrice(
            mergedItemsForCalc.map((i) => ({
              ...i,
              price: i.price.toString(),
            })) as CartItem[],
            DEFAULT_PRICING_CONFIG
          );

          await tx.cart.update({
            where: { id: userCart.id },
            data: { ...newCalc },
          });

          // 3. Delete the old guest cart to prevent duplication/orphaned data
          await tx.cart.delete({ where: { id: guestCart.id } });
        });

        // Re-fetch the updated user cart to return
        cart = await prisma.cart.findUnique({
          where: { id: userCart.id },
          include: { items: true },
        });
      }
    }

    if (!cart) return null;

    // Convert Decimal types to strings for client-side compatibility
    return convertToPlainObject({
      ...cart,
      items: cart.items.map((item) => ({
        ...item,
        price: item.price.toString(),
      })) as CartItem[],
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

    // Recalculate cart totals
    const remainingItems = await prisma.cartItem.findMany({
      where: { cartId },
    });
    const priceData = calcPrice(
      remainingItems.map((i) => ({
        ...i,
        price: i.price.toString(),
      })) as CartItem[],
      DEFAULT_PRICING_CONFIG
    );

    await prisma.cart.update({
      where: { id: cartId },
      data: { ...priceData },
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
