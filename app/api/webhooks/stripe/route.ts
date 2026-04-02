import { updateOrderToPaid } from '@/lib/actions';
import { serverEnv } from '@/lib/server-env';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  // Get the signature sent by Stripe
  const signature = req.headers.get('stripe-signature') ?? '';
  const payload = await req.text();
  const secret = serverEnv.STRIPE_WEBHOOK_SECRET;

  // Build the webhook event
  const event = Stripe.webhooks.constructEvent(payload, signature, secret);

  // Check for successful payment
  switch (event.type) {
    case 'charge.succeeded':
      const { object } = event.data;

      // Update order status
      await updateOrderToPaid({
        orderId: object.metadata.orderId,
        paymentResult: {
          id: object.id,
          status: object.status,
          email: object.billing_details.email!,
          pricePaid: (object.amount / 100).toFixed(),
        },
      });

      return NextResponse.json({
        message: 'updateOrderToPaid was successful!',
      });

    default:
      // Unexpected event type
      return NextResponse.json({
        message: `Unexpected event.type: ${event.type}`,
      });
  }
}
