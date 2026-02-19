const BASE_URL = process.env.PAYPAL_API_URL || 'https://sandbox.paypal.com';

export const paypal = {
  createOrder: async (price: number) => {
    const accessToken = await generateAccessToken();
    const url = `${BASE_URL}/v2/checkout/orders`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: price.toFixed(2),
            },
          },
        ],
      }),
    });

    return handleResponse(res);
  },
  capturePayment: async (orderId: string) => {
    const accessToken = await generateAccessToken();
    const url = `${BASE_URL}/v2/checkout/orders/${orderId}/capture`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return handleResponse(res);
  },
};

// Generate PayPal access token
export const generateAccessToken = async () => {
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

  const jsonData = await handleResponse(res);

  return jsonData.access_token;
};

const handleResponse = async (res: Response) => {
  if (res.ok) {
    return res.json();
  } else {
    const errorMsg = await res.text();
    console.error(errorMsg);
    throw new Error('Failed to generate PayPal access token');
  }
};
