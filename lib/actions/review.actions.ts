'use server';

import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { formatError } from '../utils';
import { insertReviewSchema } from '../validators';
import { prisma } from '@/db/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Review } from '@/types';

type ReviewWithUser = Review & { user: { name: string } };

type ReviewActionResult = {
  success: boolean;
  message: string;
  review?: ReviewWithUser;
};

// Create or update a review for the current user and product
export async function createUpdateReview(
  data: z.infer<typeof insertReviewSchema>,
): Promise<ReviewActionResult> {
  try {
    const userId = await getAuthenticatedUserId();

    // Validate and store the review
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
    const reviewExists = await prisma.review.findFirst({
      where: {
        productId: review.productId,
        userId: review.userId,
      },
    });

    let savedReview: ReviewWithUser | null = null;

    await prisma.$transaction(async (tx) => {
      if (reviewExists) {
        // Update review
        savedReview = await tx.review.update({
          where: { id: reviewExists.id },
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

      // Get the average rating
      const averageRating = await tx.review.aggregate({
        _avg: { rating: true },
        where: { productId: review.productId },
      });

      // Get number of reviews
      const numReviews = await tx.review.count({
        where: { productId: review.productId },
      });

      // Update the rating and numReviews in the product table
      await tx.product.update({
        where: { id: review.productId },
        data: { rating: averageRating._avg.rating || 0, numReviews },
      });
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `Review ${reviewExists ? 'updated' : 'created'} successfully`,
      review: savedReview ?? undefined,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

// Get all reviews for a product
export async function getReviews(productId: string): Promise<ReviewWithUser[]> {
  return prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// Get the current user's review for a product
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
