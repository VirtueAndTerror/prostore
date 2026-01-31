import { z } from 'zod';
import { cartItemsSchema, insertCartSchema } from '@/lib';

export type Cart = z.infer<typeof insertCartSchema>;

export type CartItem = z.infer<typeof cartItemsSchema>;
