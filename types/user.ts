import { z } from 'zod';
import { updateUserSchema, signUpFormSchema, signInFormSchema } from '@/lib';
import { ShippingAddress } from './shipping-address';

export type UpdateUser = z.infer<typeof updateUserSchema>;
// export type SignUp = z.infer<typeof signUpFormSchema>;
// export type SignIn = z.infer<typeof signInFormSchema>;

// User type as returned by getUserById (without password, with typed address)
export type User = {
  id: string;
  name: string;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: string;
  address: ShippingAddress;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
};
