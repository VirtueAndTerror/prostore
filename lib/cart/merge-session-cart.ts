import { cookies } from 'next/headers';
import { prisma } from '@/db/prisma';

export async function mergeSessionCartWithUser(userId: string) {
  const cookieStore = await cookies();
  const sessionCartId = cookieStore.get('sessionCartId')?.value;

  if (!sessionCartId) return;

  const sessionCart = await prisma.cart.findUnique({
    where: { sessionCartId },
  });

  if (!sessionCart) return;

  // delete any existing user cart
  await prisma.cart.deleteMany({
    where: { userId },
  });

  // attach session cart
  await prisma.cart.update({
    where: { id: sessionCart.id },
    data: { userId },
  });
}
