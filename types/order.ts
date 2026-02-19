import { insertOrderSchema, insertOrderItemSchema } from '@/lib';
import { z } from 'zod';

export type OrderItem = z.infer<typeof insertOrderItemSchema>;

export type Order = z.infer<typeof insertOrderSchema> & {
  /* additional fields from the database
     (not inserted by the form, but returned,
      when the data is retreived from the database) */
  id: string;
  createdAt: Date;
  isPaid: boolean;
  paidAt: Date | null;
  isDelivered: boolean;
  deliveredAt: Date | null;
  orderItems: OrderItem[];
  user: { id: string; name: string; email: string | null };
  // paymentResult: PaymentResult | null;
};

export type SalesData = {
  month: string;
  totalSales: number;
}[];
