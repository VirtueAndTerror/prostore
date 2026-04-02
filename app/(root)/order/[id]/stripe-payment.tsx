import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib';
import { SERVER_URL } from '@/lib/constants';
import { env } from '@/lib/env';
import {
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useTheme } from 'next-themes';
import { SyntheticEvent, useState } from 'react';

interface Props {
  priceInCents: number;
  orderId: string;
  clientSecret: string;
}

// Called only once per render
const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const StripePayment = ({ priceInCents, orderId, clientSecret }: Props) => {
  const { theme, systemTheme } = useTheme();


  const StripeForm = () => {
    const stripe = useStripe();
    const elements = useElements();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [email, setEmail] = useState<string>('');

    const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (stripe == null || elements == null || !email) return;

      setIsLoading(true);

      try {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${SERVER_URL}/order/${orderId}/stripe-payment-success`,
          },
        });

        if (
          error.type === 'card_error' ||
          error.type === 'validation_error'
        ) {
          setErrorMsg(error.message ?? 'An unknown error occurred');
        } else if (error) {
          setErrorMsg('An unknown error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <form className='space-y-4' onSubmit={handleSubmit}>
        <div className='text-xl'>Stripe Checkout</div>
        {errorMsg && <div>{errorMsg}</div>}
        <PaymentElement />
        <div>
          <LinkAuthenticationElement
            onChange={(e) => setEmail(e.value.email)}
          />
        </div>
        <Button
          className='w-full'
          size='lg'
          disabled={stripe == null || elements == null || isLoading}
        >
          {isLoading
            ? 'Purchasing...'
            : `Purchase ${formatCurrency(priceInCents / 100)}`}
        </Button>
      </form>
    );
  };

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const stripeTheme = resolvedTheme === "dark" ? "night" : "stripe";

  return (
    <Elements
      options={{
        clientSecret,
        appearance: {
          theme: stripeTheme
        },
      }}
      stripe={stripePromise}
    >
      <StripeForm />
    </Elements>
  );
};

export default StripePayment;
