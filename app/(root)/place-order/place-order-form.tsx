'use client';
import { Button } from '@/components/ui/button';
import { createOrder } from '@/lib/actions';
import { Check, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';

const PlaceOrderForm = () => {
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent) => {
    try {
      e.preventDefault();

      const { redirectTo } = await createOrder();

      if (redirectTo) router.push(redirectTo);
      return;
    } catch (error) {
      console.error(error);
    }
  };

  const PlaceOrderButton = () => {
    const { pending } = useFormStatus();
    return (
      <Button disabled={pending} className='w-full'>
        {pending ? (
          <Loader className='w-4 h-4 animate-spin' />
        ) : (
          <Check className='w-4 h-4' />
        )}{' '}
        Place Order
      </Button>
    );
  };

  return (
    <form onSubmit={handleSubmit} className='w-full'>
      <PlaceOrderButton />
    </form>
  );
};

export default PlaceOrderForm;
