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
import { paypal } from '../paypal';
import { convertToPlainObject, formatError, isActive } from '../utils';
import { insertOrderSchema } from '../validators';
import { getMyCart } from './cart.actions';
import { getUserById } from './user.actions';

type OrderActionResult = {
  success: boolean;
  message: string;
  redirectTo?: string;
};

type PayPalOrderActionResult = OrderActionResult & {
  orderId?: string;
};

// Main function - Create order and create order items
export const createOrder = async (): Promise<OrderActionResult> => {
  try {
    const userId = await getAuthenticatedUserId();

    // Get cart and user data
    const [cart, user] = await Promise.all([getMyCart(), getUserById(userId)]);

    // Validate order pre-requisites
    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: 'Cart is empty',
        redirectTo: '/cart',
      };
    }

    if (!user.address) {
      return {
        success: false,
        message: 'No shipping address',
        redirectTo: '/shipping-address',
      };
    }

    if (!user.paymentMethod) {
      return {
        success: false,
        message: 'No payment method',
        redirectTo: '/payment-method',
      };
    }

    // Create the order object
    const { itemsPrice, shippingPrice, taxPrice, totalPrice } = cart;
    const { id, address: shippingAddress, paymentMethod } = user;

    const order = insertOrderSchema.parse({
      userId: id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    });

    // Create a transaction to create order and order items in database

    const insertedOrderId = await prisma.$transaction(async (tx) => {
      // Create order
      const insertedOrder = await tx.order.create({ data: order });

      // Create order items from cart items
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            ...item,
            orderId: insertedOrder.id,
          },
        });
      }

      // Clear cart items and reset totals
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
};

// Get order by ID
export const getOrderById = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return order ? convertToPlainObject(order) : null;
};

// Create PayPal order
export const createPayPalOrder = async (
  orderId: string,
): Promise<PayPalOrderActionResult> => {
  try {
    // Get order form DB
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found - cannot create PayPal order');
    }

    if (order.paymentMethod !== 'PAYPAL') {
      throw new Error('Payment method is not PayPal for this order');
    }

    const paypalOrder = await paypal.createOrder(Number(order.totalPrice));

    // Update order with PayPal order ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentResult: {
          id: paypalOrder.id,
          email: '',
          status: '',
          pricePaid: 0,
        },
      },
    });

    return {
      success: true,
      message: 'PayPal order created successfully',
      orderId: paypalOrder.id,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Approve PaypPal order - Update order payment result and mark as paid
export const approvePayPalOrder = async (
  orderId: string,
  data: { orderID: string },
): Promise<OrderActionResult> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentMethod !== 'PAYPAL') {
      throw new Error('Payment method is not PayPal for this order');
    }

    const captureData = await paypal.capturePayment(data.orderID);
    if (
      !captureData ||
      captureData.status !== 'COMPLETED' ||
      captureData.id !== (order.paymentResult as PaymentResult)?.id
    ) {
      throw new Error('Payment capture failed or does not match order');
    }

    // Update order to paid
    await updateOrderToPaid({
      orderId,
      paymentResult: {
        id: captureData.id,
        status: captureData.status,
        email: captureData.payer.email_address || '',
        pricePaid:
          captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount
            ?.value || '',
      },
    });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Your order has been paid',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

export const updateOrderToPaid = async ({
  orderId,
  paymentResult,
}: {
  orderId: string;
  paymentResult?: PaymentResult;
}): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });

  if (!order) throw new Error('The order with the given ID not found');
  if (order.isPaid) throw new Error('The order is already paid');

  // Transaction to update order and product stock
  await prisma.$transaction(async (tx) => {
    // Iterate over products and update stock
    for (const item of order.orderItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true },
      });

      if (!product) {
        throw new Error('Product not found for order item');
      }

      if (product.stock < item.qty) {
        throw new Error(
          `Insufficient stock for product "${product.name}". Available: ${product.stock}, requested: ${item.qty}`,
        );
      }

      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: { stock: { increment: -item.qty } },
      });
    }

    // Set the order to paid
    await tx.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentResult,
      },
    });
  });

  // Get updated order after transaction
  const updatedOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!updatedOrder) throw new Error('Failed to retrieve updated order');

  // Send Email Receipt to the user
  sendPurchaseReciept({
    ...updatedOrder,
    shippingAddress: updatedOrder.shippingAddress as ShippingAddress,
    paymentResult: updatedOrder.paymentResult as PaymentResult,
  });
};

// Get user's orders
export const getMyOrders = async ({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) => {
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
};

// Get sales data and order summary
export const getOrderSummary = async () => {
  // Get counts for each resource
  const ordersCount = await prisma.order.count();
  const productsCount = await prisma.product.count();
  const usersCount = await prisma.user.count();

  // Calculate total sales
  const totalSales = await prisma.order.aggregate({
    _sum: { totalPrice: true },
    where: { isPaid: true },
  });

  // Get monthly sales
  const salesRawData = await prisma.$queryRaw<
    Array<{ month: string; totalSales: Prisma.Decimal }>
  >`SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM "Order" GROUP BY to_char("createdAt", 'MM/YY') ORDER BY MIN("createdAt")`;

  // Get latest sales
  const salesData: SalesData = salesRawData.map((entry) => ({
    month: entry.month,
    totalSales: Number(entry.totalSales),
  }));

  const latestSales = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    where: { isPaid: true },
    include: { user: { select: { name: true } } },
    take: 6,
  });

  return {
    ordersCount,
    productsCount,
    usersCount,
    totalSales,
    latestSales,
    salesData,
  };
};

// Get all orders
export const getAllOrders = async ({
  query = '',
  limit = PAGE_SIZE,
  page,
}: {
  query: string;
  limit?: number;
  page: number;
}) => {
  const queryFilter: Prisma.OrderWhereInput = isActive(query)
    ? {
        user: {
          name: {
            contains: query,
            mode: 'insensitive',
          } as Prisma.StringFilter,
        },
      }
    : {};

  const where = { ...queryFilter };

  const data = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    include: { user: { select: { name: true } } },
  });

  const dataCount = await prisma.order.count({ where });

  return {
    data: convertToPlainObject(data),
    totalPages: Math.ceil(dataCount / limit),
  };
};

// Delete an order
export const deleteOrder = async (
  orderId: string,
): Promise<OrderActionResult> => {
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
};

// Update COD to paid
export const updateCODToPaid = async (
  orderId: string,
): Promise<OrderActionResult> => {
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
};

// Update COD order to delivered
export const deliverOrder = async (
  orderId: string,
): Promise<OrderActionResult> => {
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
};
