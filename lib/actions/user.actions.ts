'use server';

import { auth, signIn, signOut } from '@/auth';
import { prisma } from '@/db/prisma';
import { Prisma } from '@/lib/generated/prisma';
import type { ShippingAddress } from '@/types';
import { hashSync } from 'bcrypt-ts-edge';
import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getAuthenticatedUserId } from '../auth-utils';
import { PAGE_SIZE } from '../constants';
import { formatError } from '../utils';
import {
  paymentMethodSchema,
  shippingAddressSchema,
  signInFormSchema,
  signUpFormSchema,
  updateUserSchema,
} from '../validators';

// ----- Types -----
type UserActionResult = { success: boolean; message: string };

// ----- Helpers -----
async function requireCurrentUser() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
  });
  if (!user) throw new Error('User not found');
  return user;
}

import { mergeGuestCartIntoUserCart } from './cart.actions';

// ----- Auth Actions -----
export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData,
): Promise<UserActionResult> {
  let userEmail = '';
  try {
    const credentials = signInFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    userEmail = credentials.email;

    await signIn('credentials', credentials);

    return { success: true, message: 'Signed in successfully' };
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      if (userEmail) {
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (user) await mergeGuestCartIntoUserCart(user.id);
      }
      throw error;
    }

    return { success: false, message: 'Invalid email or password' };
  }
}

/**
 * Signs the current user out.
 * Deletes all carts belonging to the user and clears the sessionCartId cookie
 * before calling NextAuth's signOut so no cart data leaks to the next session.
 *
 * NOTE: The `authorized` callback in auth.ts also rotates the sessionCartId
 * on the first unauthenticated request after sign-out, providing a second layer
 * of protection against cart-leaking between users.
 */
export async function signOutUser(): Promise<void> {
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

    // Explicitly delete the session cart cookie so the next user gets a fresh one
    cookieStore.delete('sessionCartId');

    // Signal to middleware that a sign-out just occurred
    cookieStore.set('signed-out', '1', { maxAge: 5, httpOnly: true });
    await signOut();

  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error('Error during sign out:', error);
  }
}

/**
 * Registers a new user, hashes their password, and immediately signs them in.
 * Compatible with React's useFormState (accepts prevState + FormData).
 */
export async function signUpUser(
  prevState: unknown,
  formData: FormData,
): Promise<UserActionResult> {
  let createdUserId = '';
  try {
    const { name, email, password } = signUpFormSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    const user = await prisma.user.create({
      data: { name, email, password: hashSync(password, 10) },
    });
    createdUserId = user.id;

    // Sign in immediately after registration so the user lands in an active session.
    await signIn('credentials', { email, password });

    return { success: true, message: 'User registered successfully' };
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      if (createdUserId) await mergeGuestCartIntoUserCart(createdUserId);
      throw error;
    }

    console.error(error);
    return { success: false, message: formatError(error) };
  }
}

// ----- Read Actions -----

/**
 * Fetches a user by ID, excluding the password field.
 * Throws if no user is found — callers should only pass valid IDs.
 */
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    omit: { password: true },
  });

  if (!user) {
    throw new Error('User not found with the provided ID');
  }

  return user;
}

/** Returns a paginated, optionally filtered list of all users (admin use). */
export async function getAllUsers({
  query = '',
  limit = PAGE_SIZE,
  page,
}: {
  query: string;
  limit?: number;
  page: number;
}) {
  const where: Prisma.UserWhereInput =
    query && query !== 'all'
      ? {
        name: {
          contains: query,
          mode: 'insensitive',
        } as Prisma.StringFilter,
      }
      : {};

  const [data, dataCount] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// ----- Write Actions -----

/** Saves a new shipping address for the current user. */
export async function updateUserAddress(
  data: ShippingAddress,
): Promise<UserActionResult> {
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
}

/** Saves a new payment method selection for the current user. */
export async function updateUserPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>,
): Promise<UserActionResult> {
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
}

/** Updates the current user's public display name. */
export async function updateProfile(user: {
  name: string;
  email: string;
}): Promise<UserActionResult> {
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
}

/** Updates a user's name and role (admin use). */
export async function updateUser(
  user: z.infer<typeof updateUserSchema>,
): Promise<UserActionResult> {
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
}

/** Permanently deletes a user account (admin use). */
export async function deleteUser(userId: string): Promise<UserActionResult> {
  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/admin/users');
    return { success: true, message: 'User deleted successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
}
