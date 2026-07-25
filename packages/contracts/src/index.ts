export type VehicleStatus = 'ACTIVE' | 'RESTOCKING' | 'OFFLINE';
export type ProductCategory = 'CLASSIC' | 'SIDE' | 'CONCEPT_LAB';
export type FulfillmentType = 'PICKUP' | 'DROP_OFF';
export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'EN_ROUTE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';
export type MovementType = 'ASSIGN' | 'SALE' | 'TRANSFER' | 'SPOILAGE' | 'RETURN' | 'CORRECTION';

export interface Brand {
  name: string;
  tagline: string;
  city: string;
  story: string;
  quotes?: string[];
}

export interface Vehicle {
  id: string;
  name: string;
  status: VehicleStatus;
  zone: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  etaMinutes: number;
  deliveryRadiusMiles: number;
  distanceMiles?: number | null;
  totalLeft?: number;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  priceCents: number;
  dietary: string[];
  image: string;
}

export interface InventoryItem {
  vehicleId: string;
  productId: string;
  quantity: number;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  vehicleId: string;
  customerName: string;
  customerPhone: string;
  fulfillment: FulfillmentType;
  deliveryAddress?: string;
  notes?: string;
  items: OrderItemInput[];
}

export interface Order extends CreateOrderInput {
  id: string;
  status: OrderStatus;
  subtotalCents?: number;
  taxCents?: number;
  serviceFeeCents?: number;
  totalCents: number;
  paymentState?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConceptRequest {
  id: string;
  idea: string;
  name: string;
  contact: string;
  status: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  type: MovementType | string;
  vehicleId: string;
  toVehicleId?: string;
  productId: string;
  quantity: number;
  reason?: string;
  orderId?: string;
  createdAt: string;
}
