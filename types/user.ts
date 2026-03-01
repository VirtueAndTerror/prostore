import { z } from 'zod';
import { updateUserSchema } from '@/lib';

export type UpdateUser = z.infer<typeof updateUserSchema>;
