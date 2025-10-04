import { z } from 'zod';
import { insertProductSchema } from '@/lib/validators';
export type Product = z.infer<typeof insertProductSchema> & {
  id: string;
  rating: number;
  createdAt: Date;
};

export function formatNumberWithDecimal(num: number): string {
  const [int, decimal] = num.toString().split('.');

  return decimal ? `${int}.${decimal.padEnd(2, '0')}` : `${int}.00`;
}
