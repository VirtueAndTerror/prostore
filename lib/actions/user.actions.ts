'use server';

import { auth, signIn, signOut } from '@/auth';
import { prisma } from '@/db/prisma';
import { hashSync } from 'bcrypt-ts-edge';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import {
  signInFormSchema,
  signUpFormSchema,
  paymentMethodSchema,
} from '../validators';
import { formatError } from '../utils';
import { ShippingAddress } from '@/types';
import { z } from 'zod';

// Sign in the user with credentials
export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', user);

    return { success: true, message: 'Signed in successfully' };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return { success: false, message: 'Invalid email or password' };
  }
}

// Sign Out  user
export async function signOutUser() {
  await signOut();
}

// Sign Up user
export async function signUpUser(prevState: unknown, formData: FormData) {
  try {
    const user = signUpFormSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    const { password: plainPassword, name, email } = user;

    // Hash the password before saving to database
    user.password = hashSync(user.password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: user.password,
      },
    });

    await signIn('credentials', {
      email,
      password: plainPassword,
    });

    return { success: true, message: 'User registered successfully' };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error(error);
    return { success: false, message: formatError(error) };
  }
}

// Get user by ID
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

// Update user address
export const updateUserAddress = async (address: ShippingAddress) => {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findUnique({
      where: { id: session?.user?.id },
      select: { address: true },
    });
    if (!currentUser) throw new Error('User Not Found');

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Update user's payment method
export const updateUserPaymentMethod = async (
  data: z.infer<typeof paymentMethodSchema>
) => {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id },
    });

    if (!currentUser) throw new Error('User Not Found');

    const paymentMethod = paymentMethodSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { paymentMethod: paymentMethod.type },
    });

    return {
      success: true,
      message: 'User updateded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};
