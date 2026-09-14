export function resolveUnitPrice(
  product: {
    price: number;
    tiers: {
      minQty: number;
      maxQty: number | null;
      unitPrice: number;
    }[];
  },
  quantity: number,
): number {
  const matchingTier = product.tiers.find(
    (tier) =>
      quantity >= tier.minQty &&
      (tier.maxQty === null || quantity <= tier.maxQty),
  );

  return matchingTier ? matchingTier.unitPrice : product.price;
}
