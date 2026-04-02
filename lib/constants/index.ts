import { env } from '../env';

export const APP_NAME = env.NEXT_PUBLIC_APP_NAME;

export const APP_DESCRIPTION = env.NEXT_PUBLIC_APP_DESCRIPTION;

export const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export const LATEST_PRODUCTS_LIMIT = env.LATEST_PRODUCTS_LIMIT;

export const FEATURED_PRODUCTS_LIMIT = 4;

// Forms default values
export const SIGN_IN_DEFAULT_VALUES = {
  email: '',
  password: '',
};
export const SIGN_UP_DEFAULT_VALUES = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

// Dev Tool
// export const shippingAddressDefaultValues = {
//   fullName:',
//   streetAddress: '123 Main St',
//   city: 'Anytown',
//   postalCode: '12345',
//   country: 'USA',
// };

export const SHIPPING_ADDRESS_DEFAULT_VALUES = {
  fullName: '',
  streetAddress: '',
  city: '',
  postalCode: '',
  country: '',
};

export const PRODUCT_DEFAULT_VALUES = {
  name: '',
  slug: '',
  category: '',
  images: [],
  brand: '',
  description: '',
  price: '0',
  stock: 0,
  rating: '0',
  numReviews: '0',
  isFeatured: false,
  banner: null,
};

export const REVIEW_DEFAULT_VALUES = {
  title: '',
  comment: '',
  rating: 0,
};

// Pricing Config
export const FREE_SHIPPING_THRESHOLD_CENTS = env.FREE_SHIPPING_THRESHOLD;
export const SHIPPING_FLAT_RATE_CENTS = env.SHIPPING_FLAT_RATE;
export const TAX_RATE_BASE = env.TAX_RATE;

export const DEFAULT_PRICING_CONFIG = {
  freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
  shippingFlatRateCents: SHIPPING_FLAT_RATE_CENTS,
  taxRateBase: TAX_RATE_BASE,
};

// Payments Config
export const PAYMENT_METHODS = env.PAYMENT_METHODS;

export const DEFAULT_PAYMENT_METHOD = env.PAYMENT_METHOD;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PAYPAL: 'PayPal',
  STRIPE: 'Stripe',
  CASH_ON_DELIVERY: 'Cash on Delivery',
};

export function formatPaymentMethod(method?: string | null) {
  // If no method is provided, return an empty string so calling code can render safely.
  if (!method) return '';

  // Prefer an explicit label map when available (gives us precise spelling & casing).
  // If the method isn't in the map, fall back to a generic title-casing strategy.
  return (
    PAYMENT_METHOD_LABELS[method] ??
    method
      // Normalize to lowercase so the title-casing step behaves predictably.
      .toLowerCase()
      // Split on underscores (e.g. "CASH_ON_DELIVERY" → ["cash", "on", "delivery"]).
      .split('_')
      // Capitalize the first letter of each segment.
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      // Join segments back with spaces to form a human-friendly label.
      .join(' ')
  );
}

// Pagination Constants
export const PAGE_SIZE = env.PAGE_SIZE;

export const USER_ROLES = env.USER_ROLES;

//
export const PRICES_OPTS = [
  {
    name: '$1 to $50',
    value: '1-50',
  },
  {
    name: '$51 to $100',
    value: '51-100',
  },
  {
    name: '$101 to $200',
    value: '101-200',
  },
  {
    name: '$201 to $500',
    value: '201-500',
  },
  {
    name: '$501 to $1000',
    value: '501-1000',
  },
] as const;

export const RATINGS_OPTS = [4, 3, 2, 1] as const;

export const SORT_OPTS = ['newest', 'lowest', 'highest', 'rating'] as const;

// Resend Config
export const SENDER_EMAIL = env.SENDER_EMAIL;
