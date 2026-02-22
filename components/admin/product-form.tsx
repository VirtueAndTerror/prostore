'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { insertProductSchema, updateProductSchema } from '@/lib';
import { createProduct, updateProduct } from '@/lib/actions';
import { productDefaultValues } from '@/lib/constants';
import { UploadButton } from '@/lib/uploadthing';
import { Product } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ControllerRenderProps, SubmitHandler, useForm } from 'react-hook-form';
import slugify from 'slugify';
import { z } from 'zod';

interface Props {
  type: 'CREATE' | 'UPDATE';
  product?: Product;
  productId?: string;
}

const ProductForm = ({ type, product, productId }: Props) => {
  const router = useRouter();
  const { toast } = useToast();

  const schema = type === 'UPDATE' ? updateProductSchema : insertProductSchema;
  const typeString = type === 'UPDATE' ? 'Update' : 'Create';

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: product ?? productDefaultValues,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { isSubmitting, errors },
  } = form;

  const images = watch('images');

  const onSubmit: SubmitHandler<z.infer<typeof schema>> = async (values) => {
    if (type === 'CREATE') {
      const { success, message } = await createProduct(values);

      toast({
        variant: success ? 'default' : 'destructive',
        description: message,
      });

      success && router.push('/admin/products');
    }

    if (type === 'UPDATE') {
      if (!productId) {
        router.push('/admin/products');
        return;
      }

      const { success, message } = await updateProduct({
        id: productId,
        ...values,
      });

      toast({
        variant: success ? 'default' : 'destructive',
        description: message,
      });

      success && router.push('/admin/products');
    }
  };

  type NameField = {
    field: ControllerRenderProps<z.infer<typeof schema>, 'name'>;
  };
  type SlugField = {
    field: ControllerRenderProps<z.infer<typeof schema>, 'slug'>;
  };
  type CategoryField = {
    field: ControllerRenderProps<z.infer<typeof schema>, 'category'>;
  };
  type BrandField = {
    field: ControllerRenderProps<z.infer<typeof schema>, 'brand'>;
  };
  type PriceField = {
    field: ControllerRenderProps<z.infer<typeof schema>, 'price'>;
  };
  type ImagesField = {
    field: ControllerRenderProps<z.infer<typeof schema>, 'images'>;
  };
  type DescriptionField = {
    field: ControllerRenderProps<z.infer<typeof schema>, 'description'>;
  };
  type StockField = {
    field: ControllerRenderProps<z.infer<typeof schema>, 'stock'>;
  };

  const handleGenerateSlug = () =>
    setValue('slug', slugify(getValues('name'), { lower: true }));

  return (
    <Form {...form}>
      <form
        method='POST'
        onSubmit={handleSubmit(onSubmit)}
        className='space-y-8'
      >
        <div className='flex flex-col md:flex-row gap-5'>
          {/* Name */}
          <FormField
            control={control}
            name='name'
            render={({ field }: NameField) => (
              <FormItem className='w-full'>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Enter product name' {...field} />
                </FormControl>
                <FormMessage>{errors.name?.message}</FormMessage>
              </FormItem>
            )}
          />
          {/* Slug */}
          <FormField
            control={control}
            name='slug'
            render={({ field }: SlugField) => (
              <FormItem className='w-full'>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <div className='relative'>
                    <Input placeholder='Enter slug' {...field} />
                    <Button
                      type='button'
                      className='bg-gray-500 hover:bg-gray-600 py-1 px4 mt-2 hover:cursor-pointer'
                      onClick={handleGenerateSlug}
                    >
                      Generate
                    </Button>
                  </div>
                </FormControl>
                <FormMessage>{errors.slug?.message}</FormMessage>
              </FormItem>
            )}
          />
        </div>
        <div className='flex flex-col md:flex-row gap-5'>
          {/* Category */}
          <FormField
            control={control}
            name='category'
            render={({ field }: CategoryField) => (
              <FormItem className='w-full'>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder='Enter category' {...field} />
                </FormControl>
                <FormMessage>{errors.category?.message}</FormMessage>
              </FormItem>
            )}
          />
          {/* Brand */}
          <FormField
            control={control}
            name='brand'
            render={({ field }: BrandField) => (
              <FormItem className='w-full'>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder='Enter brand' {...field} />
                </FormControl>
                <FormMessage>{errors.brand?.message}</FormMessage>
              </FormItem>
            )}
          />
        </div>
        <div className='flex flex-col md:flex-row gap-5'>
          {/* Price */}
          <FormField
            control={control}
            name='price'
            render={({ field }: PriceField) => (
              <FormItem className='w-full'>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input placeholder='Enter price' {...field} />
                </FormControl>
                <FormMessage>{errors.price?.message}</FormMessage>
              </FormItem>
            )}
          />
          {/* Stock */}
          <FormField
            control={control}
            name='stock'
            render={({ field }: StockField) => (
              <FormItem className='w-full'>
                <FormLabel>Stock</FormLabel>
                <FormControl>
                  <Input type='number' placeholder='Enter Stock' {...field} />
                </FormControl>
                <FormMessage>{errors.stock?.message}</FormMessage>
              </FormItem>
            )}
          />
        </div>
        <div className='upload-field flex flex-col md:flex-row gap-5'>
          {/* Images */}
          <FormField
            control={form.control}
            name='images'
            render={() => (
              <FormItem className='w-full'>
                <FormLabel>Images</FormLabel>
                <Card>
                  <CardContent className='space-y-2 mt-2 min-h-48'>
                    <div className='flex-start space-x-2'>
                      {images.map((image: string) => (
                        <Image
                          key={image}
                          src={image}
                          alt='product image'
                          className='w-20 h-20 object-cover object-center rounded-sm'
                          width={100}
                          height={100}
                        />
                      ))}
                      <FormControl>
                        <UploadButton
                          endpoint='imageUploader'
                          onClientUploadComplete={(res: { url: string }[]) => {
                            form.setValue('images', [...images, res[0].url]);
                          }}
                          onUploadError={(error: Error) => {
                            toast({
                              variant: 'destructive',
                              description: `ERROR! ${error.message}`,
                            });
                          }}
                        />
                      </FormControl>
                    </div>
                  </CardContent>
                </Card>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='upload-field flex flex-col md:flex-row gap-5'>
          {/* Description*/}
          <FormField
            control={control}
            name='description'
            render={({ field }: DescriptionField) => (
              <FormItem className='w-full'>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Enter product description'
                    {...field}
                  />
                </FormControl>
                <FormMessage>{errors.description?.message}</FormMessage>
              </FormItem>
            )}
          />
        </div>
        <div>
          <Button
            type='submit'
            size={'lg'}
            disabled={isSubmitting}
            className='button col-span-2 w-full hover:cursor-pointer'
          >
            {isSubmitting ? 'Submitting...' : `${typeString} Product`}
          </Button>
        </div>
        {/* Submit*/}
      </form>
    </Form>
  );
};

export default ProductForm;
