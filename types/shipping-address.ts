import { shippingAddressSchema } from '@/lib';
import { z } from 'zod';

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
