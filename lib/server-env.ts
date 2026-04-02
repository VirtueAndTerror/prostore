import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables in development (server-only)
if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  config(); // loads .env
  config({ path: '.env.local', override: false });
}

const serverEnvSchema = z.object({
  // Required strings
  PAYPAL_CLIENT_ID: z.string().min(1, {
    message: 'PAYPAL_CLIENT_ID is required',
  }),
  PAYPAL_APP_SECRET: z.string().min(1, {
    message: 'PAYPAL_APP_SECRET is required',
  }),
  STRIPE_SECRET_KEY: z.string().min(1, {
    message: 'STRIPE_SECRET_KEY is required',
  }),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, {
    message: 'STRIPE_WEBHOOK_SECRET is required',
  }),
  RESEND_API_KEY: z.string().min(1, {
    message: 'RESEND_API_KEY is required',
  }),
  DATABASE_URL: z.url({
    message: 'DATABASE_URL must be a valid URL',
  }),
  UPLOADTHING_TOKEN: z.string().min(1, {
    message: 'UPLOADTHING_TOKEN is required',
  }),
  UPLOADTHING_SECRET_KEY: z.string().min(1, {
    message: 'UPLOADTHING_SECRET_KEY is required',
  }),
  AUTH_SECRET: z.string().min(1, {
    message: 'AUTH_SECRET is required',
  }),

  // Optional with defaults
  PAYPAL_API_URL: z
    .url({ message: 'PAYPAL_API_URL must be a valid URL' })
    .default('https://api-m.sandbox.paypal.com'),

});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Server environment validation failed: ${errors}`);
}

export const serverEnv = parsed.data;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
