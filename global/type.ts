export interface CreateTierInput {
  minQty: number;
  maxQty?: number | null;
  unitPrice: number;
}

export interface CreateProductInput {
  sellerId: number;
  name: string;
  discount: number;
  description?: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  minimumQty?: number;
  images: string[];
  tiers: CreateTierInput[];
  supplierCountry: string;
  createdAt?: Date;
  updatedAt?: Date;
}
