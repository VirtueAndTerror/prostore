import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert prisma object inot a regular JS object
export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Format errors
// exlint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError(error: any) {
  if (error.name === 'ZodError') {
    // Handle Zod error

    const parsedErrorMsg = JSON.parse(error.message)[0];
    console.error(error);
    console.log({ ZodError: parsedErrorMsg });
    return parsedErrorMsg.message;
    // const fieldErrors = Object.keys(error.errors).map(
    //   (field) => error.errors[field].message
    // );
    // return fieldErrors.join('. ');
  } else if (
    error.name === 'PrismaClientKnownRequestError' &&
    error.code === 'P2002'
  ) {
    // Handle Prisma error
    const field = error.meta?.target ? error.meta.target[0] : 'Field';
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  } else {
    // Handle other errors
    return typeof error.message === 'string'
      ? error.message
      : JSON.stringify(error.message);
  }
}

export function round2Decimals(num: number | string) {
  if (typeof num === 'number') {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  } else if (typeof num === 'string') {
    return Math.round(Number(num + Number.EPSILON * 100) / 100);
  } else {
    throw new Error('Invalid number or string');
  }
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export const formatCurrency = (amount: number | string | null) => {
  if (typeof amount === 'number') {
    return currencyFormatter.format(amount);
  } else if (typeof amount === 'string') {
    return currencyFormatter.format(Number(amount));
  } else {
    return NaN;
  }
};
