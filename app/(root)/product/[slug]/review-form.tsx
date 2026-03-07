'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { insertReviewSchema } from '@/lib';
import { createUpdateReview, getReviewByProductId } from '@/lib/actions';
import { REVIEW_DEFAULT_VALUES } from '@/lib/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { StarIcon } from 'lucide-react';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Review } from '@/types';

interface Props {
  userId: string;
  productId: string;
  onReviewSubmitted: (review: Review) => void;
}

const ReviewForm = ({ userId, productId, onReviewSubmitted }: Props) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof insertReviewSchema>>({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: REVIEW_DEFAULT_VALUES,
  });

  const {
    control,
    handleSubmit,
    register,
    formState: { isSubmitting },
    setValue,
  } = form;

  // Open Form Handler
  const handleFromOpen = async () => {
    // set values required by the validation schema
    setValue('productId', productId);
    setValue('userId', userId);

    // Look up for already existing review
    const review = await getReviewByProductId(productId);
    // Set pre-fill the form with retrieved values
    if (review) {
      setValue('title', review.title);
      setValue('description', review.description);
      setValue('rating', review.rating);
    }

    setOpen(true);
  };

  // Submit Form Handler
  const onSubmit: SubmitHandler<z.infer<typeof insertReviewSchema>> = async (
    values,
  ) => {
    const { success, message, review } = await createUpdateReview({
      ...values,
      productId,
    });

    if (!success || !review) {
      return toast({ variant: 'destructive', description: message });
    }

    setOpen(false);
    onReviewSubmitted(review);

    toast({ description: message });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={handleFromOpen} variant={'default'}>
        Write a Review
      </Button>
      <DialogContent className='sm: max-w-110'>
        <Form {...form}>
          <form method='POST' onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle> Write a Review</DialogTitle>
              <DialogDescription>
                Share your thoughts with other customers
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <FormField
                control={control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter title' {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder='Enter description' {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name='rating'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <Select
                      value={field.value ? field.value.toString() : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select rating' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <SelectItem key={idx} value={(idx + 1).toString()}>
                            {idx + 1} <StarIcon className='inline h4 w-4' />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type='submit'
                size={'lg'}
                className='w-full'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
