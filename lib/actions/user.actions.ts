'use server';

import { auth, signIn, signOut } from '@/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/db/prisma';
import { Prisma } from '@/lib/generated/prisma';
import { hashSync } from 'bcrypt-ts-edge';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import {
  signInFormSchema,
  signUpFormSchema,
  paymentMethodSchema,
  shippingAddressSchema,
  updateUserSchema,
} from '../validators';
import { formatError } from '../utils';
import { ShippingAddress } from '@/types';
import { z } from 'zod';
import { getMyCart } from './cart.actions';
import { PAGE_SIZE } from '../constants';
import { revalidatePath } from 'next/cache';

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
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return { success: false, message: 'Invalid email or password' };
  }
}

// Sign Out user
export async function signOutUser() {
  try {
    // Get user's cart and delete it.
    const currentCart = await getMyCart();
    if (currentCart?.id) {
      await prisma.cart.delete({ where: { id: currentCart.id } });

      // Delete corresponing cart from cookie
      const cookieStore = await cookies();
      cookieStore.delete('sessionCartId');
    }
  } catch (error) {
    console.error('Error deleting cart on sign out:', error);
  }
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
    throw new Error('User not found with the provided ID');
  }

  return user;
};

// Update user's address
export const updateUserAddress = async (data: ShippingAddress) => {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findUnique({
      where: { id: session?.user?.id },
    });

    if (!currentUser) throw new Error('User Not Found');

    const address = shippingAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { address },
    });

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
  data: z.infer<typeof paymentMethodSchema>,
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

export const updateProfile = async (user: { name: string; email: string }) => {
  try {
    const session = await auth();
    const currentUser = await prisma.user.findUnique({
      where: { id: session?.user?.id },
    });

    if (!currentUser) {
      throw new Error('User with the given credentials was not found');
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { name: user.name },
    });

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    console.error(error);
    return {
      succsess: false,
      message: formatError(error),
    };
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

  const dataCount = await prisma.user.count();
  const totalPages = Math.ceil(dataCount / limit);

  return {
    data,
    totalPages,
  };
};

// Delete
export const deleteUser = async (userId: string) => {
  try {
    await prisma.user.delete({ where: { id: userId } });

    revalidatePath('/admin/users');

    return {
      success: true,
      message: 'User deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Update

export const updateUser = async (user: z.infer<typeof updateUserSchema>) => {
  try {
    const { id, name, role } = user;

    await prisma.user.update({
      where: { id },
      data: {
        id,
        name,
        role,
      },
    });

    revalidatePath('/admin/users');

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
