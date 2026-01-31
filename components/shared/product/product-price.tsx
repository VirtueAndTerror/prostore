import { cn } from '@/lib/utils';

interface Props {
  price: string;
  className?: string;
}

const ProductPrice = ({ price, className }: Props) => {
  // Number.prototype.toFixed returns a string and ensures two decimal places
  const stringValue = Number(price).toFixed(2);
  // Get the int/float
  const [intValue, floatValue] = stringValue.split('.');

  return (
    <p className={cn('text-2xl', className)}>
      <span className='text-xs align-super'>$</span>
      {intValue}
      <span className='text-xs align-super'>.{floatValue}</span>
    </p>
  );
};

export default ProductPrice;
