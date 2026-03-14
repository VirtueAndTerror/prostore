import { paymentResultSchema } from '@/lib';
import { z } from 'zod';

export type PaymentResult = z.infer<typeof paymentResultSchema>;


// PayPal API v2 types
export interface PayPalLink {
    href: string;
    rel: string;
    method: string;
  }
  
  export interface PayPalAmount {
    currency_code: string;
    value: string;
  }
  
  export interface PayPalCapture {
    id: string;
    status: string;
    amount: PayPalAmount;
    create_time: string;
    update_time: string;
  }
  
  export interface PayPalPurchaseUnit {
    reference_id?: string;
    amount?: PayPalAmount;
    payments?: {
      captures?: PayPalCapture[];
    };
  }
  
  export interface PayPalOrder {
    id: string;
    status: string;
    intent: string;
    links: PayPalLink[];
    purchase_units?: PayPalPurchaseUnit[];
  }
  
  export interface PayPalPayer {
    name?: {
      given_name?: string;
      surname?: string;
    };
    email_address?: string;
    payer_id?: string;
    address?: {
      country_code?: string;
    };
  }
  
  export type CreateOrderResponse = Pick<PayPalOrder, 'id' | 'status' | 'links'>;
  
  export type CapturePaymentResponse = PayPalOrder & {
    payer: PayPalPayer;
  };

// TypeScript type for PayPal Order Create payload
export interface PayPalOrderPayload {
    intent: 'CAPTURE' | 'AUTHORIZE';
    purchase_units: Array<{
      reference_id?: string;
      description?: string;
      custom_id?: string;
      invoice_id?: string;
      soft_descriptor?: string;
      amount: {
        currency_code: string; // e.g., "USD"
        value: string;         // e.g., "100.00"
        breakdown?: {
          item_total?: {
            currency_code: string;
            value: string;
          };
          shipping?: {
            currency_code: string;
            value: string;
          };
          handling?: {
            currency_code: string;
            value: string;
          };
          tax_total?: {
            currency_code: string;
            value: string;
          };
          discount?: {
            currency_code: string;
            value: string;
          };
        };
      };
      items?: Array<{
        name: string;
        unit_amount: {
          currency_code: string;
          value: string;
        };
        quantity: string;
        description?: string;
        sku?: string;
        category?: 'PHYSICAL_GOODS' | 'DIGITAL_GOODS' | 'DONATION';
        tax?: {
          currency_code: string;
          value: string;
        };
      }>;
      shipping?: {
        method?: string;
        address: {
          address_line_1: string;
          address_line_2?: string;
          admin_area_2: string; // City
          admin_area_1: string; // State/Province
          postal_code: string;
          country_code: string;
        };
      };
    }>;
    application_context?: {
      brand_name?: string;
      locale?: string;
      landing_page?: 'LOGIN' | 'BILLING' | 'NO_PREFERENCE';
      shipping_preference?: 'GET_FROM_FILE' | 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS';
      user_action?: 'CONTINUE' | 'PAY_NOW';
      return_url?: string;
      cancel_url?: string;
    };
  }
  
  
