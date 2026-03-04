import { z } from 'zod';
import { insertReviewSchema } from '@/lib';

export type Review = z.infer<typeof insertReviewSchema> & {
  id: string;
  createdAt: Date;
  user?: { name: string };
};
