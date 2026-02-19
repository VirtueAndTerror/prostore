import { generateAccessToken, paypal } from '../lib/paypal';

// Test to generate access token from PayPal API
test('Generate PayPal Access Token', async () => {
  const tokenResponse = await generateAccessToken();
  console.log(tokenResponse);

  expect(typeof tokenResponse).toBe('string');
  expect(tokenResponse.length).toBeGreaterThan(0);
});

// Test to create a Paypal order
test('Create Paypal Order', async () => {
  const price = 10.0;

  const orderResponse = await paypal.createOrder(price);
  console.log(orderResponse);

  expect(orderResponse).toHaveProperty('id');
  expect(orderResponse).toHaveProperty('status');
  expect(orderResponse.status).toBe('CREATED');
});

// Test to capture a PayPal payment
test('Capture PayPal Order', async () => {
  const orderId = '123456';

  const mockCapturePayment = jest
    .spyOn(paypal, 'capturePayment')
    .mockResolvedValue({ status: 'COMPLETED' });

  const captureResponse = await paypal.capturePayment(orderId);

  expect(captureResponse).toHaveProperty('status', 'COMPLETED');

  mockCapturePayment.mockRestore();
});
