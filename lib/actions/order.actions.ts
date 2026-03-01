'use server';

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import type { CartItem, PaymentResult, SalesData } from '@/types';
import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { PAGE_SIZE } from '../constants';
import { Prisma } from '../generated/prisma';
import { paypal } from '../paypal';
import { convertToPlainObject, formatError } from '../utils';
import { insertOrderSchema } from '../validators';
import { getMyCart } from './cart.actions';
import { getUserById } from './user.actions';

// Main function - Create order and create order items
export const createOrder = async () => {
  try {
    // Authenticate user
    const session = await auth();
    if (!session) throw new Error('User not authenticated');

    const userId = session.user?.id;
    if (!userId) throw new Error('User ID not found in session');

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
      for (const item of cart.items as CartItem[]) {
        await tx.orderItem.create({
          data: {
            ...item,
            price: item.price,
            orderId: insertedOrder.id,
          },
        });
      }

      // CLear cart
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          items: [],
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
  } catch (error) {
    if (isRedirectError(error)) throw error;

    console.error(error);
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Get order by ID
export const getOrderById = async (orderId: string) => {
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        orderItems: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return convertToPlainObject(order);
  } catch (error) {
    console.error('Failed to get order by ID', error);
  }
};

// Create PayPal order
export const createPayPalOrder = async (
  orderId: string,
): Promise<{ success: boolean; message: string; data?: string }> => {
  try {
    // Get order form DB
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order)
      throw new Error('Order Not Found in DB - Cannot create PayPal order');

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
      data: paypalOrder.id,
    };
  } catch (error) {
    console.error(error);
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
) => {
  try {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });

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
        email: captureData.payer.email_address,
        pricePaid:
          captureData.purchase_units[0]?.payments?.captures[0]?.amount?.value,
      },
    });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Your order has been paid',
    };
  } catch (error) {
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
}) => {
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
};

// Get user's orders
export const getMyOrders = async ({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) => {
  const session = await auth();
  if (!session) throw new Error('User not authorized');
  const userId = session.user?.id;
  if (!userId) throw new Error('User ID not found in session');

  const data = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.order.count({ where: { userId } });

  return {
    data,
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
  >`SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM "Order" GROUP BY to_char("createdAt", 'MM/YY')`;

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
  const queryFilter: Prisma.OrderWhereInput =
    query && query !== 'all'
      ? {
          user: {
            name: {
              contains: query,
              mode: 'insensitive',
            } as Prisma.StringFilter,
          },
        }
      : {};

  const data = await prisma.order.findMany({
    where: { ...queryFilter },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    include: { user: { select: { name: true } } },
  });

  const dataCount = await prisma.order.count();

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
};

// Delete an order
export const deleteOrder = async (orderId: string) => {
  try {
    await prisma.order.delete({ where: { id: orderId } });
    revalidatePath('/admin/orders');

    return {
      success: true,
      message: 'Order deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Update COD to paid
export const updateCODToPaid = async (orderId: string) => {
  try {
    await updateOrderToPaid({ orderId });
    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Order marked as paid',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Update COD order to delivered
export const deliverOrder = async (orderId: string) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new Error('Order with the given ID not found');
    if (!order.isPaid) throw new Error('Order has no been paid');

    await prisma.order.update({
      where: { id: orderId },
      data: { isDelivered: true, deliveredAt: new Date() },
    });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: 'Order marked as delivered',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};
