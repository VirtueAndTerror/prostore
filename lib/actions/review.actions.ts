'use server';

import { prisma } from '@/db/prisma';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import type { Review } from '@/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formatError } from '../utils';
import { insertReviewSchema } from '../validators';

// ----- Types -----
type ReviewWithUser = Review & { user: { name: string } };

type ReviewActionResult = {
  success: boolean;
  message: string;
  review?: ReviewWithUser;
};
// ----- Helpers -----

async function syncProductRating(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  productId: string,
): Promise<void> {
  const [{ _avg }, numReviews] = await Promise.all([
    tx.review.aggregate({ _avg: { rating: true }, where: { productId } }),
    tx.review.count({ where: { productId } }),
  ]);

  await tx.product.update({
    where: { id: productId },
    data: { rating: _avg.rating ?? 0, numReviews },
  });
}

// ----- Actions -----

/**
 * Creates or updates the current user's review for a product.
 * After saving, recalculates the product's aggregate rating and review count
 * within the same transaction to keep them consistent.
 */
export async function createUpdateReview(
  data: z.infer<typeof insertReviewSchema>,
): Promise<ReviewActionResult> {
  try {
    const userId = await getAuthenticatedUserId();
    const review = insertReviewSchema.parse({
      ...data,
      userId,
    });

    // Get product that is being reviewed (only id and slug needed)
    const product = await prisma.product.findUnique({
      where: { id: review.productId },
      select: { id: true, slug: true },
    });
    if (!product) throw new Error('Product not found');

    // Check if user already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        productId: review.productId,
        userId: review.userId,
      },
    });

    let savedReview: ReviewWithUser | null = null;

    await prisma.$transaction(async (tx) => {
      if (existingReview) {
        // Update only the mutable fields - userId and productId are immutable.
        savedReview = await tx.review.update({
          where: { id: existingReview.id },
          data: {
            title: review.title,
            description: review.description,
            rating: review.rating,
          },
          include: { user: { select: { name: true } } },
        });
      } else {
        savedReview = await tx.review.create({
          data: review,
          include: { user: { select: { name: true } } },
        });
      }

      // Keep the product's cached rating / numReviews in sync.
      await syncProductRating(tx, product.id);
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `Review ${existingReview ? 'updated' : 'created'} successfully`,
      review: savedReview ?? undefined,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

/** Returns all reviews for a product, newest first, with reviewer names. */
export async function getReviews(productId: string): Promise<ReviewWithUser[]> {
  return prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns the current user's review for a product, or null if they have not
 * reviewed it (or are not signed in).
 */
export async function getUserReviewForProduct(
  productId: string,
): Promise<Review | null> {
  const userId = await getAuthenticatedUserId().catch(() => null);
  if (!userId) return null;

  const data = await prisma.review.findFirst({
    where: { productId, userId },
  });

  return data;
}
