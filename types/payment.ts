import { paymentResultSchema } from '@/lib';
import { z } from 'zod';

export type PaymentResult = z.infer<typeof paymentResultSchema>;
