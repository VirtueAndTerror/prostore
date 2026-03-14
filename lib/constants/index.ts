export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Prostore';

export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  'A modern e-commerce store build with Next.js';

export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

export const LATEST_PRODUCTS_LIMIT = Number(
  process.env.LATEST_PRODUCTS_LIMIT || 4,
);

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

// Payments Config
export const PAYMENT_METHODS = process.env.PAYMENT_METHODS
  ? process.env.PAYMENT_METHODS.split(', ')
  : ['PAYPAL', 'STRIPE', 'CASH_ON_DELIVERY'];

export const DEFAULT_PAYMENT_METHOD = process.env.PAYMENT_METHOD || 'PAYPAL';

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
export const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 4;

export const USER_ROLES = process.env.USER_ROLES
  ? process.env.USER_ROLES.split(', ')
  : new Array('admin', 'user');

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
export const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
