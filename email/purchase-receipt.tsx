import sampleData from '@/db/sample-data';
import { formatCurrency } from '@/lib';
import { env } from '@/lib/env';
import type { Order } from '@/types';
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import * as crypto from 'crypto';
require('dotenv').config();

// Polyfill crypto for React Email preview
if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore
  globalThis.crypto = crypto;
}

interface Props {
  order: Order;
}

PurchaseReceiptEmail.PreviewProps = {
  order: {
    id: crypto.randomUUID(),
    userId: '123',
    user: {
      name: 'John Doe',
      email: 'test@test.com',
    },
    paymentMethod: 'Stripe',
    shippingAddress: {
      fullName: 'John Doe',
      streetAddress: '1234 Main St',
      city: 'San Francisco',
      postalCode: '94107',
      country: 'US',
    },
    createdAt: new Date(),
    totalPrice: '100',
    taxPrice: '10',
    shippingPrice: '10',
    itemsPrice: '80',
    orderItems: sampleData.products.map((p) => ({
      name: p.name,
      orderId: '123',
      productId: '123',
      qty: p.stock,
      image: p.images[0],
      price: p.price.toString(),
      slug: p.slug,
    })),
    isDelivered: true,
    deliveredAt: new Date(),
    isPaid: true,
    paidAt: new Date(),
    paymentResult: {
      id: '123',
      status: 'succeded',
      pricePaid: '100',
      email: 'test@test.com',
    },
  },
} satisfies Props;

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export default function PurchaseReceiptEmail({ order }: Props) {
  const {
    id,
    orderItems,
    createdAt,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = order;
  return (
    <Html>
      <Preview>View order receipt</Preview>
      <Tailwind>
        <Head />
        <Body className='font-sans bg-white'>
          <Container className='max-w-xl'>
            <Heading>Purchase Receipt</Heading>
            <Section>
              <Row>
                <Column>
                  <Text className='mb-0 mr-4 text-gray-500 whitespace-nowrap text-nowrap'>
                    Order ID
                  </Text>
                  <Text className='mb-0 mr-4'>{id.toString()}</Text>
                </Column>
                <Column>
                  <Text className='mb-0 mr-4 text-gray-500 whitespace-nowrap text-nowrap'>
                    Purchase Date
                  </Text>
                  <Text className='mt-0 mr-4'>
                    {dateFormatter.format(createdAt)}{' '}
                  </Text>
                </Column>
              </Row>
            </Section>
            <Section className='border border-solid border-gray-500 rounded-lg p-4 md:p-6'>
              {orderItems.map(({ name, productId, image, qty, price }) => (
                <Row key={productId}>
                  <Column className='w-20'>
                    <Img
                      width={80}
                      alt={name}
                      className='rounded'
                      src={
                        image.startsWith('/')
                          ? // When the image is locally hosted, prefix the url with the value of the PUBLIC_SERVER constant
                            `${env.NEXT_PUBLIC_SERVER_URL}${image}`
                          : // Otherwise use the default url, ex. https://utfs.io/...
                            image
                      }
                    />
                  </Column>
                  <Column className='align-top'>
                    {name} X {qty}
                  </Column>
                  <Column align='right' className='align-top'>
                    {' '}
                    {formatCurrency(price)}
                  </Column>
                </Row>
              ))}
              {[
                { name: 'Items', price: itemsPrice },
                { name: 'Tax', price: taxPrice },
                { name: 'Shipping', price: shippingPrice },
                { name: 'Total', price: totalPrice },
              ].map(({ name, price }) => (
                <Row key={name} className='py-1'>
                  <Column align='right'>{name}</Column>
                  <Column align='right' width={70} className='align-top'>
                    {formatCurrency(price)}
                  </Column>
                </Row>
              ))}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
