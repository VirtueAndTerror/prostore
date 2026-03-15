import { DollarSign, Headset, ShoppingBag, WalletCards } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const IconBoxes = () => {
  return (
    <div>
      <Card>
        <CardContent className='grid md:grid-cols-4 gap-4 p-4 justify-items-center'>
          <div className='space-y-2 flex flex-center flex-col'>
            <ShoppingBag aria-hidden />
            <p className='text-sm font-bold'>Free Shipping</p>
            <p className='text-sm text-muted-foreground'>
              Free shipping on orders above $100
            </p>
          </div>
          <div className='space-y-2 flex flex-center flex-col'>
            <DollarSign aria-hidden />
            <p className='text-sm font-bold'>Money Back Guarantee</p>
            <p className='text-sm text-muted-foreground'>
              Within 30 days of purchase
            </p>
          </div>
          <div className='space-y-2 flex flex-center flex-col'>
            <WalletCards aria-hidden />
            <p className='text-sm font-bold'>Flexible Payment</p>
            <p className='text-sm text-muted-foreground'>
              Pay with credit card, PayPal or COD
            </p>
          </div>
          <div className='space-y-2 flex flex-center flex-col'>
            <Headset aria-hidden />
            <p className='text-sm font-bold'>24/7 Support</p>
            <p className='text-sm text-muted-foreground'>
              Get support at any time
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IconBoxes;
