import { clsx, type ClassValue } from 'clsx';
import qs from 'query-string';
import { twMerge } from 'tailwind-merge';
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError(error: unknown): string {
  // Always log the raw error for server-side debugging
  console.error(error);

  // Zod v4 validation errors — uses .issues (v4 removed .errors getter)
  if (error instanceof z.ZodError) {
    const issues = error.issues.map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'form';
      return `${path}: ${issue.message}`;
    });

    return issues.join(' | ') || 'Validation failed.';
  }

  // Prisma v7 known request errors (query engine errors with a code)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : String(error.meta?.target ?? 'Field');
        return `${target.charAt(0).toUpperCase() + target.slice(1)} already exists.`;
      }
      case 'P2003': {
        const field = String(error.meta?.field_name ?? 'Related record');
        return `${field} references a record that does not exist.`;
      }
      case 'P2014':
        return 'This change would violate a required relation between records.';
      case 'P2021':
        return 'The requested resource does not exist in the database.';
      case 'P2022':
        return 'A required field is missing from the database.';
      case 'P2023':
        return 'The data provided is inconsistent with the expected format.';
      case 'P2025':
        return 'Record not found.';
      default:
        return 'A database error occurred. Please try again later.';
    }
  }

  // Prisma validation errors (malformed queries, missing fields, type mismatches)
  if (error instanceof Prisma.PrismaClientValidationError) {
    return 'Invalid data submitted. Please check your input and try again.';
  }

  // Prisma initialization/connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 'Unable to connect to the database. Please try again later.';
  }

  // Native Error (checked after Prisma subclasses to avoid shadowing)
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred.';
  }

  // Plain string errors
  if (typeof error === 'string') {
    return error;
  }

  // Other thrown values (e.g. plain objects with a message property)
  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }

  return 'An unexpected error occurred. Please try again later.';
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
