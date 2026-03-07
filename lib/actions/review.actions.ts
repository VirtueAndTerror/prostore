'use server';

import { formatError } from '../utils';
import { auth } from '@/auth';
import { insertReviewSchema } from '../validators';
import { prisma } from '@/db/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Review } from '@/types';

// Create & Update a Review
export const createUpdateReview = async (
  data: z.infer<typeof insertReviewSchema>,
) => {
  try {
    const session = await auth();
    if (!session) throw new Error('User not authenticated');

    // Validate and store the review
    const review = insertReviewSchema.parse({
      ...data,
      userId: session.user?.id,
    });

    // Get product that is being reviewed
    const product = await prisma.product.findUnique({
      where: { id: review.productId },
    });
    if (!product) throw new Error('Product not found');

    // Check if user already reviewed
    const reviewExists = await prisma.review.findFirst({
      where: {
        productId: review.productId,
        userId: review.userId,
      },
    });

    let savedReview: Review | null = null;

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
      review: savedReview,
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Get All Reviews
export const getReviews = async (productId: string): Promise<Review[]> => {
  const data = await prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (!data)
    throw new Error('Reviews of the product with the given ID not found');

  return data;
};

export async function getReviewByProductId(
  productId: string,
): Promise<Review | null> {
  const session = await auth();
  if (!session) throw new Error('User not authenticated');

  const data = await prisma.review.findFirst({
    where: { productId, userId: session.user?.id },
  });

  return data;
}
