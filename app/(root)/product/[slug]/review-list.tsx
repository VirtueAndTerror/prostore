'use client';
import Rating from '@/components/shared/product/rating';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDateTime } from '@/lib';
import { getReviews } from '@/lib/actions';
import type { Review } from '@/types';
import { Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ReviewForm from './review-form';

interface Props {
  userId: string;
  productId: string;
  slug: string;
}

const ReviewList = ({ userId, productId, slug }: Props) => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      const fetchedReviews = await getReviews(productId);
      setReviews(fetchedReviews);
    };

    fetchReviews();
  }, [productId]);

  const handleReviewSubmitted = (newReview: Review) => {
    setReviews((prev) => {
      // Determine if this review already exists in the list
      const updated = prev.some((r) => r.id === newReview.id)
        ? // If it exists, replace the old version with the updated one
          prev.map((r) => (r.id === newReview.id ? newReview : r))
        : // If it doesn't exist, insert new review at the top (newest first)
          [newReview, ...prev];

      // Keep the list sorted by createdAt so it always renders newest-first
      return [...updated].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    });
  };

  return (
    <div className='space-y-4'>
      {reviews.length === 0 && <p>No reviews yet.</p>}
      {userId ? (
        <ReviewForm
          userId={userId}
          productId={productId}
          onReviewSubmitted={handleReviewSubmitted}
        />
      ) : (
        <p>
          Please,{' '}
          <Link
            className='text-blue-700'
            href={`/sign-in?callbackUrl=/product/${slug}`}
          >
            sign in
          </Link>{' '}
          to write a review.
        </p>
      )}
      <div className='flex flex-col gap-3'>
        {reviews.map(({ id, title, description, rating, createdAt, user }) => (
          <Card key={id}>
            <CardHeader>
              <div className='flex-between'>
                <CardTitle>{title}</CardTitle>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex space-x-4 text-sm text-muted-foreground'>
                {/* RATING */}
                <Rating value={rating} />
                {/* USER */}
                <div className='flex items-center'>
                  <User className='mr-1 h-3 w-3' />
                  {user ? user.name : 'Deleted User'}
                </div>
                <div className='flex items-center'>
                  <Calendar className='mr-1 h-3 w-3' />
                  {formatDateTime(createdAt).dateTime}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReviewList;
