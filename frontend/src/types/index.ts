// Update the Billing interface to remove items
export interface Billing {
  id: string;
  invoice_number: string;
  workflow_number: string;
  vendor_number: string;
  status: BillingStatus;
  amount: number;
  due_date: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  paidAt?: Date;
}

export interface Inventory {
  id: number;
  sku: string;
  product_name: string;
  warehouse_code: string;
  stock_check: number;
  outbound: number;
  weight: number;
  height: number;
  length: number;
  width: number;
  cbm: number;
  vendor_number: string;
  created_at: Date;
  updated_at: Date;
}

export interface InboundShipment {
  id: number;
  shipping_date: string;
  box_label: string;
  sku: string;
  warehouse_code: string;
  item_quantity: number;
  arriving_date: string;
  tracking_number: string;
  vendor_number?: string;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OutboundShipment {
  id: number;
  order_date: Date;
  order_id: string;
  sku: string;
  item_quantity: number;
  warehouse_code: string;
  stock_check: number;
  customer_name: string;
  country: string;
  address1: string;
  address2?: string; // optional, can be null
  zip_code: string;
  city: string;
  state: string;
  tracking_number: string;
  shipping_fee: number;
  note?: string; // optional, can be null
  image_link?: string; // optional, can be null
  vendor_number: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClaimsList {
  id: number;
  order_id: string;
  order_date: Date;
  sku: string;
  item_quantity: number;
  warehouse_code: string;
  stock_check: number;
  customer_name: string;
  country: string;
  address1: string;
  address2?: string; // optional, can be null
  zip_code: string;
  city: string;
  state: string;
  tracking_number: string;
  shipping_fee: number;
  status: "Solved" | "Denied" | "New" | "Claimed";
  reason?: string; // optional, can be null
  response_action?: string; // optional, can be null
  invoice_link?: string; // optional, can be null
  note?: string; // optional, can be null
  vendor_number: string;
  created_at: Date;
  updated_at: Date;
}

// Remove BillingItem interface as it's no longer needed
