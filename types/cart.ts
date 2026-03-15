import { z } from 'zod';
import { cartItemsSchema, insertCartSchema } from '@/lib'; // ← your import path

export type CartItem = z.infer<typeof cartItemsSchema>;

// Updated Cart type – now includes the relational items array
export type Cart = z.infer<typeof insertCartSchema> & {
  id: string;
  items: CartItem[]; // ← this was missing → now fixed
  status?: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date | null;
  // Add any other Prisma fields you use in getMyCart / UI if needed
};
