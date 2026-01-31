import { cn } from '@/lib';
import { Fragment } from 'react';

interface Props {
  current: number;
}

const CheckoutSteps = ({ current = 0 }: Props) => {
  const steps = [
    'User Login',
    'Shipping Address',
    'Payment Method',
    'Place Order',
  ];

  const fixedClasses = 'p-2 w-56 rounded-full text-center text-sm';

  return (
    <div className='flex-between flex-col md:flex-row space-x-2 space-y-2 mb-10'>
      {steps.map((step, idx) => (
        <Fragment key={step}>
          <div
            className={cn(fixedClasses, idx === current ? 'bg-secondary' : '')}
          >
            {step}
          </div>
          {step !== 'Place Order' && (
            <hr className='w-16 border-t border-gray-300 mx-2' />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default CheckoutSteps;
