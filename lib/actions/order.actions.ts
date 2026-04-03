'use server';

import { prisma } from '@/db/prisma';
import { sendPurchaseReciept } from '@/email';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import type {
  CartItem,
  PaymentResult,
  SalesData,
  ShippingAddress,
} from '@/types';
import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { PAGE_SIZE } from '../constants';
import { Prisma } from '../generated/prisma';
import { convertToPlainObject, formatError, isActive } from '../utils';
import { insertOrderSchema, insertOrderItemSchema } from '../validators';
import { getMyCart } from './cart.actions';
import { getUserById } from './user.actions';

// ----- Types -----

type OrderActionResult = {
  success: boolean;
  message: string;
  redirectTo?: string;
};

// ----- Helpers -----
/**
 * Marks an order as paid, decrements product stock for every order item,
 * and sends a purchase-receipt email to the buyer.
 * Exposed separately so it can be called by both PayPal and COD flows.
 */

export async function updateOrderToPaid({
  orderId,
  paymentResult,
}: {
  orderId: string;
  paymentResult?: PaymentResult;
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });

  if (!order) throw new Error('Order not found');
  if (order.isPaid) throw new Error('Order is already paid');

  await prisma.$transaction(async (tx) => {
    for (const item of order.orderItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true },
      });

      if (!product) throw new Error('Product not found for order item');

      if (product.stock < item.qty) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.qty}`,
        );
      }

      // Decrement stock by the ordered quantity.
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: -item.qty } },
      });
    }

    // Mark the order paid.
    await tx.order.update({
      where: { id: order.id },
      data: { isPaid: true, paidAt: new Date(), paymentResult },
    });
  });

  // Re-fetch with relations needed for the receipt email.
  const updatedOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!updatedOrder) throw new Error('Failed to retrieve updated order');

  sendPurchaseReciept({
    ...updatedOrder,
    shippingAddress: updatedOrder.shippingAddress as ShippingAddress,
    paymentResult: updatedOrder.paymentResult as PaymentResult,
  });
}

// ----- Actions -----

/**
 * Creates an order from the current user's cart.
 * Validates that a shipping address and payment method are set before proceeding.
 * Clears the cart on success and redirects to the new order page.
 */
export async function createOrder(): Promise<OrderActionResult> {
  try {
    const userId = await getAuthenticatedUserId();
    const [cart, user] = await Promise.all([getMyCart(), getUserById(userId)]);

    // Guard: cart must be non-empty.
    if (!cart?.items?.length) {
      return {
        success: false,
        message: 'Cart is empty',
        redirectTo: '/cart',
      };
    }
    // Guard: shipping address must be set.
    if (!user.address) {
      return {
        success: false,
        message: 'No shipping address',
        redirectTo: '/shipping-address',
      };
    }
    // Guard: payment method must be set.
    if (!user.paymentMethod) {
      return {
        success: false,
        message: 'No payment method',
        redirectTo: '/payment-method',
      };
    }

    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });

    // Create the order, its items, and clear the cart atomically.
    const insertedOrderId = await prisma.$transaction(async (tx) => {
      const insertedOrder = await tx.order.create({ data: order });

      // Create order items from cart items
      for (const item of cart.items) {
        const orderItem = insertOrderItemSchema.parse(item);

        await tx.orderItem.create({
          data: {
            ...orderItem,
            orderId: insertedOrder.id,
          },
        });
      }

      // Empty the cart without deleting the record itself
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          itemsPrice: 0,
          shippingPrice: 0,
          totalPrice: 0,
          taxPrice: 0,
        },
      });

      return insertedOrder.id;
    });

    if (!insertedOrderId)
      throw new Error('Failed to create order - no order ID returned');

    return {
      success: true,
      message: 'Order created successfully',
      redirectTo: `/order/${insertedOrderId}`,
    };
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;

    return {
      success: false,
      message: formatError(error),
    };
  }
}

/** Fetches a single order by ID, including its items and the buyer's public info. */
export async function getOrderById(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return order ? convertToPlainObject(order) : null;
}

/** Returns a paginated list of orders for the currently authenticated user. */
export async function getMyOrders({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) {
  const userId = await getAuthenticatedUserId();

  const data = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.order.count({ where: { userId } });

  return {
    data: convertToPlainObject(data),
    totalPages: Math.ceil(dataCount / limit),
  };
}

/**
 * Returns aggregated dashboard data: entity counts, total revenue, monthly sales
 * breakdown, and the six most recent paid orders.
 */
export async function getOrderSummary() {
  // Get counts for each resource
  const [
    ordersCount,
    productsCount,
    usersCount,
    totalSales,
    salesRawData,
    latestSales,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.user.count(),

    // Calculate total sales
    prisma.order.aggregate({
      _sum: { totalPrice: true },
      where: { isPaid: true },
    }),

    // Get monthly sales
    prisma.$queryRaw<
      Array<{ month: string; totalSales: Prisma.Decimal }>
    >`SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM "Order" GROUP BY to_char("createdAt", 'MM/YY') ORDER BY MIN("createdAt")`,

    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      where: { isPaid: true },
      include: { user: { select: { name: true } } },
      take: 6,
    }),
  ]);

  // Get latest sales
  const salesData: SalesData = salesRawData.map((entry) => ({
    month: entry.month,
    totalSales: Number(entry.totalSales),
  }));

  return {
    ordersCount,
    productsCount,
    usersCount,
    totalSales,
    latestSales,
    salesData,
  };
}

/** Returns a paginated, optionally filtered list of all orders (admin use). */
export async function getAllOrders({
  query = '',
  limit = PAGE_SIZE,
  page,
}: {
  query: string;
  limit?: number;
  page: number;
}) {
  const where: Prisma.OrderWhereInput = isActive(query)
    ? {
        user: {
          name: {
            contains: query,
            mode: 'insensitive',
          } as Prisma.StringFilter,
        },
      }
    : {};

  const [data, dataCount] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: { user: { select: { name: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: convertToPlainObject(data),
    totalPages: Math.ceil(dataCount / limit),
  };
}

/** Permanently deletes an order record (admin use). */
export async function deleteOrder(orderId: string): Promise<OrderActionResult> {
  try {
    await prisma.order.delete({ where: { id: orderId } });
    revalidatePath('/admin/orders');

    return {
      success: true,
      message: 'Order deleted successfully',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

/** Marks a Cash-on-Delivery order as paid (admin use). */
export async function updateCODToPaid(
  orderId: string,
): Promise<OrderActionResult> {
  try {
    await updateOrderToPaid({ orderId });
    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Order marked as paid',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

/** Marks a paid order as delivered (admin use). */
export async function deliverOrder(
  orderId: string,
): Promise<OrderActionResult> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new Error('Order with the given ID not found');
    if (!order.isPaid) throw new Error('Order has not been paid');

    await prisma.order.update({
      where: { id: orderId },
      data: { isDelivered: true, deliveredAt: new Date() },
    });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Order marked as delivered',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}
