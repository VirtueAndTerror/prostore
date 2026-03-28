import ProductForm from '@/components/admin/product-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create New Product',
};

const CreateProductPage = () =>
(
  <>
    <h2 className='h2-bold'>Create New Product</h2>{' '}
    <div className='my-8'>
      <ProductForm type='CREATE' />
    </div>
  </>
);


export default CreateProductPage;
