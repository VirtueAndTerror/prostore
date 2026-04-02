'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { paypal } from '@/lib/paypal';
import { formatError } from '@/lib/utils';
import type { PaymentResult } from '@/types';
import { updateOrderToPaid } from './order.actions';

export type PayPalOrderActionResult = {
  success: boolean;
  message: string;
  orderId?: string;
};

export async function createPayPalOrder(
  orderId: string,
): Promise<PayPalOrderActionResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error('Order not found - cannot create PayPal order');
    if (order.paymentMethod !== 'PAYPAL')
      throw new Error('Payment method is not PayPal for this order');

    const paypalOrder = await paypal.createOrder(Number(order.totalPrice));

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
}

export async function approvePayPalOrder(
  orderId: string,
  data: { orderID: string },
): Promise<{ success: boolean; message: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error('Order not found');
    if (order.paymentMethod !== 'PAYPAL')
      throw new Error('Payment method is not PayPal for this order');

    const captureData = await paypal.capturePayment(data.orderID);
    const storedId = (order.paymentResult as PaymentResult)?.id;

    if (
      !captureData ||
      captureData.status !== 'COMPLETED' ||
      captureData.id !== storedId
    ) {
      throw new Error('Payment capture failed or does not match order');
    }

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
}
