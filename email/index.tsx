import { APP_NAME, SENDER_EMAIL } from '@/lib/constants';
import { serverEnv } from '@/lib/server-env';
import type { Order } from '@/types';
import { Resend } from 'resend';
import PurchaseReceiptEmail from './purchase-receipt';
require('dotenv').config();

const resend = new Resend(serverEnv.RESEND_API_KEY);

export const sendPurchaseReciept = async (order: Order) => {
  await resend.emails.send({
    from: `${APP_NAME} <${SENDER_EMAIL}>`,
    to: [order.user.email!],
    subject: `Order Confirmation ${order.id}`,
    react: <PurchaseReceiptEmail order={order} />,
  });
};
