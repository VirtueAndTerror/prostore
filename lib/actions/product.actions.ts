'use server';
import { prisma } from '@/db/prisma';
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from '../constants';
import { convertToPlainObject, formatError, isActive } from '../utils';
import { revalidatePath } from 'next/cache';
import { insertProductSchema, updateProductSchema } from '../validators';
import z from 'zod';
import { ProductFromDB } from '@/types';
import { Prisma } from '@/lib/generated/prisma';

// Get lastest Products
export const getLatestProducts = async () => {
  const data = await prisma.product.findMany({
    take: LATEST_PRODUCTS_LIMIT,
    orderBy: { createdAt: 'desc' },
  });

  return convertToPlainObject(data);
};

// Get Single Product By it's slug
export const getProductBySlug = async (
  slug: string,
): Promise<ProductFromDB | null> =>
  await prisma.product.findFirst({ where: { slug } });

// Get Single Product By it's ID
export const getProductById = async (
  productId: string,
): Promise<ProductFromDB | null> => {
  const data = await prisma.product.findFirst({ where: { id: productId } });

  return convertToPlainObject(data);
};

// Get All Products
export const getAllProducts = async ({
  query,
  limit = PAGE_SIZE,
  page,
  category,
  price,
  rating,
  sort,
}: {
  query: string;
  limit?: number;
  page: number;
  category?: string;
  price?: string;
  rating?: string;
  sort?: string;
}) => {
  // Query filter
  const queryFilter: Prisma.ProductWhereInput = isActive(query)
    ? {
        name: {
          contains: query,
          mode: 'insensitive',
        } as Prisma.StringFilter,
      }
    : {};

  // Category filter
  const categoryFilter: Prisma.ProductWhereInput = isActive(category)
    ? { category }
    : {};

  // Price filter
  const priceFilter: Prisma.ProductWhereInput = isActive(price)
    ? {
        price: {
          gte: Number(price?.split('-')[0]),
          lte: Number(price?.split('-')[1]),
        },
      }
    : {};

  // Rating filter
  const ratingFilter = isActive(rating)
    ? { rating: { gte: Number(rating) } }
    : {};

  const [data, dataCount] = await prisma.$transaction([
    prisma.product.findMany({
      where: {
        ...queryFilter,
        ...categoryFilter,
        ...priceFilter,
        ...ratingFilter,
      },
      orderBy:
        sort === 'lowest'
          ? { price: 'asc' }
          : sort === 'highest'
            ? { price: 'desc' }
            : sort === 'rating'
              ? { rating: 'desc' }
              : { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count(),
  ]);

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
};

// Delete product
export const deleteProduct = async (productId: string) => {
  try {
    await prisma.product.delete({ where: { id: productId } });
    revalidatePath('/admin/products');

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Create a product
export const createProduct = async (
  data: z.infer<typeof insertProductSchema>,
) => {
  try {
    const product = insertProductSchema.parse(data);
    await prisma.product.create({ data: product });

    revalidatePath('/admin/products');

    return {
      success: true,
      message: 'Product created successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Update a product
export const updateProduct = async (
  data: z.infer<typeof updateProductSchema>,
) => {
  try {
    const product = updateProductSchema.parse(data);

    await prisma.product.update({ where: { id: product.id }, data: product });
    revalidatePath('/admin/products');

    return {
      success: true,
      message: 'Product created successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
};

// Get All Categories
export const getAllCategories = async () => {
  const data = await prisma.product.groupBy({
    by: ['category'],
    _count: true,
  });

  return data;
};

// Get Featured Products
export const getFeaturedProducts = async () => {
  const data = await prisma.product.findMany({
    where: { isFeatured: true },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return convertToPlainObject(data);
};
