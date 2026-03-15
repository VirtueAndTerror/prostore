'use server';
import { prisma } from '@/db/prisma';
import { Prisma } from '@/lib/generated/prisma';
import type { Product } from '@/types';
import { revalidatePath } from 'next/cache';
import z from 'zod';
import {
  FEATURED_PRODUCTS_LIMIT,
  LATEST_PRODUCTS_LIMIT,
  PAGE_SIZE,
} from '../constants';
import { convertToPlainObject, formatError, isActive } from '../utils';
import { insertProductSchema, updateProductSchema } from '../validators';

type ProductActionResult = { success: boolean; message: string };

const SORT_ORDER_MAP = {
  lowest: { price: 'asc' as const },
  highest: { price: 'desc' as const },
  rating: { rating: 'desc' as const },
} as const;

// Get latest Products
export const getLatestProducts = async () => {
  const data = await prisma.product.findMany({
    take: LATEST_PRODUCTS_LIMIT,
    orderBy: { createdAt: 'desc' },
  });

  return convertToPlainObject(data);
};

// Get Single Product By slug
export const getProductBySlug = async (
  slug: string,
): Promise<Product | null> => {
  const data = await prisma.product.findFirst({ where: { slug } });
  return data ? convertToPlainObject(data) : null;
};

// Get Single Product By ID
export const getProductById = async (
  productId: string,
): Promise<Product | null> => {
  const data = await prisma.product.findUnique({ where: { id: productId } });

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

  // Price filter (expects "min-max" format e.g. "1-50")
  const priceFilter: Prisma.ProductWhereInput = (() => {
    if (!price || !isActive(price)) return {};
    const [minStr, maxStr] = price.split('-');
    const min = Number(minStr);
    const max = Number(maxStr);
    if (Number.isNaN(min) || Number.isNaN(max)) return {};
    return { price: { gte: min, lte: max } };
  })();

  // Rating filter
  const ratingFilter = isActive(rating)
    ? { rating: { gte: Number(rating) } }
    : {};

  const where = {
    ...queryFilter,
    ...categoryFilter,
    ...priceFilter,
    ...ratingFilter,
  };

  const orderBy =
    sort && sort in SORT_ORDER_MAP
      ? SORT_ORDER_MAP[sort as keyof typeof SORT_ORDER_MAP]
      : { createdAt: 'desc' as const };

  const [data, dataCount] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: convertToPlainObject(data),
    totalPages: Math.ceil(dataCount / limit),
  };
};

// Delete product
export const deleteProduct = async (
  productId: string,
): Promise<ProductActionResult> => {
  try {
    await prisma.product.delete({ where: { id: productId } });
    revalidatePath('/admin/products');
    return { success: true, message: 'Product deleted successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
};

// Create a product
export const createProduct = async (
  data: z.infer<typeof insertProductSchema>,
): Promise<ProductActionResult> => {
  try {
    const product = insertProductSchema.parse(data);
    await prisma.product.create({ data: product });
    revalidatePath('/admin/products');
    return { success: true, message: 'Product created successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
};

// Update a product
export const updateProduct = async (
  data: z.infer<typeof updateProductSchema>,
): Promise<ProductActionResult> => {
  try {
    const product = updateProductSchema.parse(data);
    const { id, ...updateData } = product;

    await prisma.product.update({
      where: { id },
      data: updateData,
    });
    revalidatePath('/admin/products');
    return { success: true, message: 'Product updated successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
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
    take: FEATURED_PRODUCTS_LIMIT,
  });

  return convertToPlainObject(data);
};
