import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import qs from 'query-string';
import z from 'zod';
import { Prisma } from './generated/prisma';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert prisma object inot a regular JS object
export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Format errors
// exlint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError(error: unknown): string {
  // 1. Always log the raw error for server-side debugging
  console.error('Raw Error:;', error);

  // 2. Guard Clause: Handle Zod Validation Errors
  if (error instanceof z.ZodError) {
    const validationErrors = z.flattenError(error);
    const { formErrors, fieldErrors } = validationErrors;

    // Collect all field errors into a readable list
    const fieldMessages = (
      Object.entries(fieldErrors) as [string, string[]][]
    ).map(([field, msgs]) => `${field}: ${msgs?.join(', ')}`);

    const allMessages = [...formErrors, ...fieldMessages];

    return allMessages.join('\n') || 'Validation faild';
  }
  // 3. Guard Clause: Handle Prisma Known Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || ['Field'];
      const field = target[0];
      return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    }
    // Handle record not found in DB
    if (error.code === 'P2025') {
      return error.message || 'Record not found';
    }

    //Internal fallback for other Prisma codes
    return `Database error: ${error.message}`;
  }
  // 4. Guard Clause: Standard JavaScript Error
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string'
    ? error
    : 'An unexpected error has occurred. Please try again later';
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

// Format Number
const NUM_FORMATTER = new Intl.NumberFormat('en-US');

export const formatNumber = (num: number) => NUM_FORMATTER.format(num);

// Format ID (e.g. order ID) to show only last 6 characters
export const formatId = (id: string) => `...${id.substring(id.length - 6)}`;

// Format date and times
export const formatDateTime = (dateString: Date) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    month: 'short', // abbreviated month name (e.g., 'Oct')
    year: 'numeric', // abbreviated month name (e.g., 'Oct')
    day: 'numeric', // numeric day of the month (e.g., '25')
    hour: 'numeric', // numeric hour (e.g., '8')
    minute: 'numeric', // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  };
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short', // abbreviated weekday name (e.g., 'Mon')
    month: 'short', // abbreviated month name (e.g., 'Oct')
    year: 'numeric', // numeric year (e.g., '2023')
    day: 'numeric', // numeric day of the month (e.g., '25')
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric', // numeric hour (e.g., '8')
    minute: 'numeric', // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  };
  const formattedDateTime: string = new Date(dateString).toLocaleString(
    'en-US',
    dateTimeOptions,
  );
  const formattedDate: string = new Date(dateString).toLocaleString(
    'en-US',
    dateOptions,
  );
  const formattedTime: string = new Date(dateString).toLocaleString(
    'en-US',
    timeOptions,
  );
  return {
    dateTime: formattedDateTime,
    dateOnly: formattedDate,
    timeOnly: formattedTime,
  };
};

// Form the pagination links
export const buildUrlQuery = ({
  params,
  key,
  value,
}: {
  params: string;
  key: string;
  value: string | null;
}) => {
  const query = qs.parse(params);

  query[key] = value;

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query,
    },
    {
      skipNull: true,
    },
  );
};

// Returns a Boolean
export const isActive = (value?: string) =>
  value !== 'all' && value?.trim() !== '';
