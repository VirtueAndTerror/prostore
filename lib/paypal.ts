import type { PayPalOrderPayload, CapturePaymentResponse, CreateOrderResponse } from "@/types";

// Sandbox: https://api-m.sandbox.paypal.com
// Live:    https://api-m.paypal.com
const BASE_URL =
  process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';



// Paypal environment variables validation function
export function validateEnv(): void {
  const { PAYPAL_CLIENT_ID, PAYPAL_APP_SECRET } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_APP_SECRET) {
    throw new Error('Missing PayPal required environment variables');
  }
}

// Main Paypal Object
export const paypal = {
  createOrder: async (price: number): Promise<CreateOrderResponse> => {
    const accessToken = await generateAccessToken();
    const url = `${BASE_URL}/v2/checkout/orders/`;
    const orderPayload: PayPalOrderPayload = {
      intent: 'CAPTURE' as const,
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: price.toFixed(2),
          },
        },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    return await handleResponse<CreateOrderResponse>(res, 'createOrder');
  },
  capturePayment: async (orderId: string): Promise<CapturePaymentResponse> => {
    const accessToken = await generateAccessToken();
    const url = `${BASE_URL}/v2/checkout/orders/${orderId}/capture`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return await handleResponse<CapturePaymentResponse>(res, 'capturePayment');
  },
};

// Generate PayPal access token
export const generateAccessToken = async (): Promise<string> => {
  validateEnv();
  const { PAYPAL_CLIENT_ID, PAYPAL_APP_SECRET } = process.env;
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_APP_SECRET}`).toString(
    'base64',
  );

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) throw new Error(`Paypal token request failed: ${res.status}`);

  const data = await res.json();

  if (!data?.access_token) throw new Error('Paypal token missing in response');

  return data.access_token;
};

async function handleResponse<T>(res: Response, funcName: string): Promise<T> {
  const text = await res.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })()
    : null;

  if (res.ok) {
    if (data === null) {
      throw new Error(`PayPal ${funcName}: Invalid JSON response`);
    }
    return data as T;
  }

  const message =
    data?.message ??
    data?.details?.[0]?.description ??
    data?.details?.[0]?.issue ??
    text ??
    res.statusText;
  const errorMsg = `PayPal ${funcName} failed (${res.status}): ${message}`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}
