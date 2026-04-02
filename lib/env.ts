import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables in development (server-only)
if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  config(); // loads .env
  config({ path: '.env.local', override: false });
}

// Base schema for all variables (including NEXT_PUBLIC_*)
const baseEnvSchema = z.object({
  // Public NEXT_PUBLIC_* variables
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required',
  }),
  NEXT_PUBLIC_APP_NAME: z.string().default('Prostore'),
  NEXT_PUBLIC_APP_DESCRIPTION: z
    .string()
    .default('A modern e-commerce store build with Next.js'),
  NEXT_PUBLIC_SERVER_URL: z
    .url({ message: 'NEXT_PUBLIC_SERVER_URL must be a valid URL' })
    .default('http://localhost:3000'),
  SENDER_EMAIL: z
    .email({ message: 'SENDER_EMAIL must be a valid email' })
    .default('onboarding@resend.dev'),
  PAYMENT_METHOD: z.string().default('PAYPAL'),

  // Config variables (used in constants, have defaults)
  LATEST_PRODUCTS_LIMIT: z.coerce
    .number()
    .int()
    .positive({ message: 'LATEST_PRODUCTS_LIMIT must be a positive integer' })
    .default(4),
  FREE_SHIPPING_THRESHOLD: z.coerce
    .number()
    .int()
    .positive({ message: 'FREE_SHIPPING_THRESHOLD must be a positive integer' })
    .default(10000),
  SHIPPING_FLAT_RATE: z.coerce
    .number()
    .int()
    .positive({ message: 'SHIPPING_FLAT_RATE must be a positive integer' })
    .default(1000),
  TAX_RATE: z.coerce
    .number()
    .positive({ message: 'TAX_RATE must be a positive number' })
    .default(0.15),
  PAGE_SIZE: z.coerce
    .number()
    .int()
    .positive({ message: 'PAGE_SIZE must be a positive integer' })
    .default(4),
  PAYMENT_METHODS: z
    .string()
    .default('PAYPAL, STRIPE, CASH_ON_DELIVERY')
    .transform((s) => s.split(', ')),
  USER_ROLES: z
    .string()
    .default('admin, user')
    .transform((s) => s.split(', ')),
});

// Next.js inlines NEXT_PUBLIC_* vars at build time only when referenced
// as literal `process.env.NEXT_PUBLIC_X` expressions. On the client,
// `process.env` is an empty object, so we must explicitly reference each
// public variable for the bundler to replace them.
const envInput =
  typeof window === 'undefined'
    ? process.env
    : {
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    };

const parsed = baseEnvSchema.safeParse(envInput);

if (!parsed.success) {
  const errors = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Environment validation failed: ${errors}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof baseEnvSchema>;