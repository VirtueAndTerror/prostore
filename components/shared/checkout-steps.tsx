import { cn } from '@/lib';
import { Fragment } from 'react';

interface Props {
  current: number;
}

const STEPS = [
  'User Login',
  'Shipping Address',
  'Payment Method',
  'Place Order',
] as const;

const LAST_STEP = STEPS.length - 1;

const FIXED_CLASSES = 'p-2 w-56 rounded-full text-center text-sm';

const CheckoutSteps = ({ current = 0 }: Props) => {
  return (
    <div className='flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0 md:space-x-2 mb-10'>
      {STEPS.map((step, idx) => (
        <Fragment key={step}>
          <div
            className={cn(FIXED_CLASSES, idx === current ? 'bg-secondary' : '')}
          >
            {step}
          </div>

          {idx < LAST_STEP && (
            <hr className='w-16 border-t border-gray-300 mx-2' />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default CheckoutSteps;
