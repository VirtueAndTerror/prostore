import { updateOrderToPaid } from '@/lib/actions';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  // Build the webhook event
  const event = Stripe.webhooks.constructEvent(
    await req.text(),
    req.headers.get('stripe-signature') as string,
    process.env.STRIPE_WEBHOOK_SECRET as string,
  );

  // Check for successful payment
  if (event.type === 'charge.succeeded') {
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
  }

  return NextResponse.json({
    message: 'event.type is not "charge.succeded"',
  });
}
