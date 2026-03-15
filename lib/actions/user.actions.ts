'use server';

import { auth, signIn, signOut } from '@/auth';
import { prisma } from '@/db/prisma';
import { Prisma } from '@/lib/generated/prisma';
import { ShippingAddress } from '@/types';
import { hashSync } from 'bcrypt-ts-edge';
import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { PAGE_SIZE } from '../constants';
import { formatError } from '../utils';
import {
  paymentMethodSchema,
  shippingAddressSchema,
  signInFormSchema,
  signUpFormSchema,
  updateUserSchema,
} from '../validators';
import { getMyCart } from './cart.actions';
import { getAuthenticatedUserId } from '../auth-utils';

type UserActionResult = { success: boolean; message: string };

async function requireCurrentUser() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
  });
  if (!user) throw new Error('User not found');
  return user;
}

// Sign in the user with credentials
export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData,
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', user);

    return { success: true, message: 'Signed in successfully' };
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: 'Invalid email or password' };
  }
}

// Sign Out user
export async function signOutUser() {
  try {
    const userId = await getAuthenticatedUserId();
    const cookieStore = await cookies();
    const sessionCartId = cookieStore.get('sessionCartId')?.value;
    // Delete All carts associated with this user OR this session

    await prisma.cart.deleteMany({
      where: {
        OR: [{ userId }, ...(sessionCartId ? [{ sessionCartId }] : [])],
      },
    });

    cookieStore.delete('sessionCartId');
    await signOut();
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error('Error during sign out:', error);
  }
}

// Sign Up user
export async function signUpUser(
  prevState: unknown,
  formData: FormData,
): Promise<UserActionResult> {
  try {
    const user = signUpFormSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    const { password: plainPassword, name, email } = user;

    // Hash the password before saving to database
    const hashedPassword = hashSync(user.password, 10);

    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    await signIn('credentials', { email, password: plainPassword });

    return { success: true, message: 'User registered successfully' };
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error(error);
    return { success: false, message: formatError(error) };
  }
}

// Get user by ID (excludes password)
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    omit: { password: true },
  });

  if (!user) {
    throw new Error('User not found with the provided ID');
  }

  return user;
};

// Update user's address
export const updateUserAddress = async (
  data: ShippingAddress,
): Promise<UserActionResult> => {
  try {
    const currentUser = await requireCurrentUser();
    const address = shippingAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { address },
    });

    return { success: true, message: 'User updated successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
};

// Update user's payment method
export const updateUserPaymentMethod = async (
  data: z.infer<typeof paymentMethodSchema>,
): Promise<UserActionResult> => {
  try {
    const currentUser = await requireCurrentUser();
    const paymentMethod = paymentMethodSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { paymentMethod: paymentMethod.type },
    });

    return { success: true, message: 'User updated successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
};

export const updateProfile = async (user: {
  name: string;
  email: string;
}): Promise<UserActionResult> => {
  try {
    const currentUser = await requireCurrentUser();

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { name: user.name },
    });

    return { success: true, message: 'User updated successfully' };
  } catch (error: unknown) {
    console.error(error);
    return { success: false, message: formatError(error) };
  }
};

// Get All Users
export const getAllUsers = async ({
  query = '',
  limit = PAGE_SIZE,
  page,
}: {
  query: string;
  limit?: number;
  page: number;
}) => {
  const queryFilter: Prisma.UserWhereInput =
    query && query !== 'all'
      ? {
          name: {
            contains: query,
            mode: 'insensitive',
          } as Prisma.StringFilter,
        }
      : {};

  const data = await prisma.user.findMany({
    where: { ...queryFilter },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.user.count({ where: { ...queryFilter } });
  const totalPages = Math.ceil(dataCount / limit);

  return {
    data,
    totalPages,
  };
};

// Delete
export const deleteUser = async (userId: string): Promise<UserActionResult> => {
  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/admin/users');
    return { success: true, message: 'User deleted successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
};

// Update
export const updateUser = async (
  user: z.infer<typeof updateUserSchema>,
): Promise<UserActionResult> => {
  try {
    const { id, name, role } = user;

    await prisma.user.update({
      where: { id },
      data: { name, role },
    });

    revalidatePath('/admin/users');
    return { success: true, message: 'User updated successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
};
