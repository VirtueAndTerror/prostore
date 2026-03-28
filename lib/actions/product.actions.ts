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

// ----- Types -----
type ProductActionResult = { success: boolean; message: string };

// ----- Constatns -----
/** Maps sort query-param values to Prisma orderBy objects. */
const SORT_ORDER_MAP = {
  lowest: { price: 'asc' as const },
  highest: { price: 'desc' as const },
  rating: { rating: 'desc' as const },
} as const;

// ----- Read Actions -----
/** Returns the most recently created products up to LATEST_PRODUCTS_LIMIT. */
export async function getLatestProducts() {
  const data = await prisma.product.findMany({
    take: LATEST_PRODUCTS_LIMIT,
    orderBy: { createdAt: 'desc' },
  });

  return convertToPlainObject(data);
}

/** Returns a single product by its URL slug, or null if not found. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const data = await prisma.product.findFirst({ where: { slug } });
  return data ? convertToPlainObject(data) : null;
}

/** Returns a single product by its ID, or null if not found. */
export async function getProductById(
  productId: string,
): Promise<Product | null> {
  const data = await prisma.product.findUnique({ where: { id: productId } });

  return convertToPlainObject(data);
}

/**
 * Returns a paginated, filtered, and sorted list of products.
 *
 * Filter parameters:
 *  - query    : partial name match (case-insensitive)
 *  - category : exact category match
 *  - price    : "min-max" range string, e.g. "10-50"
 *  - rating   : minimum rating threshold
 *  - sort     : one of "lowest" | "highest" | "rating" (defaults to newest first)
 */
export async function getAllProducts({
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
}) {
  // Build each filter clause independently so they compose cleanly.

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

  // Price filter (expects "min-max" format e.g. "1-50"): ignore if malformed.
  const priceFilter: Prisma.ProductWhereInput = (() => {
    if (!price || !isActive(price)) return {};
    const [min, max] = price.split('-').map(Number);

    return Number.isNaN(min) || Number.isNaN(max)
      ? {}
      : { price: { gte: min, lte: max } };
  })();

  // Rating filter
  const ratingFilter: Prisma.ProductWhereInput = (() => {
    if (!rating || !isActive(rating)) return {};
    const numRating = Number(rating);
    return Number.isNaN(numRating) ? {} : { rating: { gte: numRating } };
  })();

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
}

/** Returns all distinct product categories with their product counts. */
export async function getAllCategories() {
  const data = await prisma.product.groupBy({
    by: ['category'],
    _count: true,
  });

  return data;
}

/** Returns featured products ordered by newest first, up to FEATURED_PRODUCTS_LIMIT. */
export async function getFeaturedProducts() {
  const data = await prisma.product.findMany({
    where: { isFeatured: true },
    orderBy: { createdAt: 'desc' },
    take: FEATURED_PRODUCTS_LIMIT,
  });

  return convertToPlainObject(data);
}

// ----- Write Actions -----

/** Creates a new product after validating the payload against insertProductSchema. */
export async function createProduct(
  data: z.infer<typeof insertProductSchema>,
): Promise<ProductActionResult> {
  try {
    const product = insertProductSchema.parse(data);
    await prisma.product.create({ data: product });
    revalidatePath('/admin/products');
    return { success: true, message: 'Product created successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
}

/** Updates an existing product after validating the payload against updateProductSchema. */
export async function updateProduct(
  data: z.infer<typeof updateProductSchema>,
): Promise<ProductActionResult> {
  try {
    const { id, ...updateData } = updateProductSchema.parse(data);

    await prisma.product.update({
      where: { id },
      data: updateData,
    });
    revalidatePath('/admin/products');
    return { success: true, message: 'Product updated successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
}

/** Permanently deletes a product by ID. */
export async function deleteProduct(
  productId: string,
): Promise<ProductActionResult> {
  try {
    await prisma.product.delete({ where: { id: productId } });
    revalidatePath('/admin/products');
    return { success: true, message: 'Product deleted successfully' };
  } catch (error: unknown) {
    return { success: false, message: formatError(error) };
  }
}
