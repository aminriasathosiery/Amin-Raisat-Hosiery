import { CartItem, ShippingSettings } from '@/types';

export interface DeliveryCalculationResult {
  totalPhysicalPieces: number;
  baseDeliveryCharge: number;
  freeDeliveryThreshold: number;
  minOrderQty: number;
  maxOrderQty: number;
  isFreeDeliveryEnabled: boolean;
  hasFreeDeliveryDeal: boolean;
  isFreeDeliveryUnlocked: boolean;
  deliveryFee: number;
  piecesNeededForFreeDelivery: number;
}

/**
 * Normalizes raw ShippingSettings so explicit 0 values are preserved cleanly
 * without falling back to hardcoded legacy defaults via `||`.
 */
export function normalizeShippingSettings(raw?: Partial<ShippingSettings> | null): ShippingSettings {
  const minRaw = raw?.minOrderQty;
  const maxRaw = raw?.maxOrderQty;
  const baseRaw = raw?.baseDeliveryCharge;
  const thresholdRaw = raw?.freeDeliveryThreshold;

  const minOrderQty =
    minRaw !== undefined && minRaw !== null && Number.isFinite(Number(minRaw))
      ? Math.max(1, Math.floor(Number(minRaw)))
      : 1;

  const maxOrderQty =
    maxRaw !== undefined && maxRaw !== null && Number.isFinite(Number(maxRaw))
      ? Math.max(minOrderQty, Math.floor(Number(maxRaw)))
      : 100;

  const baseDeliveryCharge =
    baseRaw !== undefined && baseRaw !== null && Number.isFinite(Number(baseRaw))
      ? Math.max(0, Number(baseRaw))
      : 200;

  // 0 disables threshold-based free delivery; positive integers enable free delivery at X+ physical pieces
  const freeDeliveryThreshold =
    thresholdRaw !== undefined && thresholdRaw !== null && Number.isFinite(Number(thresholdRaw))
      ? Math.max(0, Math.floor(Number(thresholdRaw)))
      : 3;

  return {
    minOrderQty,
    maxOrderQty,
    baseDeliveryCharge,
    freeDeliveryThreshold,
  };
}

export interface PhysicalPieceItemInput {
  type?: 'product' | 'deal';
  dealId?: string;
  quantity?: number;
  piecesCount?: number;
  isFreeDelivery?: boolean;
}

/**
 * Computes total physical garment pieces across products and multi-piece deals.
 */
export function computeTotalPhysicalPieces(items: PhysicalPieceItemInput[]): number {
  return items.reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (qty === 0) return sum;
    const isDeal = item.type === 'deal' || Boolean(item.dealId);
    if (isDeal) {
      const piecesPerDeal = Math.max(1, Math.floor(Number(item.piecesCount) || 1));
      return sum + qty * piecesPerDeal;
    }
    return sum + qty;
  }, 0);
}

/**
 * Computes authoritative delivery fee and unlock state using live ShippingSettings
 * and physical piece count rules.
 */
export function calculateOrderDelivery(
  items: PhysicalPieceItemInput[] | CartItem[],
  rawShipping?: Partial<ShippingSettings> | null
): DeliveryCalculationResult {
  const shipping = normalizeShippingSettings(rawShipping);
  const totalPhysicalPieces = computeTotalPhysicalPieces(items);
  const isFreeDeliveryEnabled = shipping.freeDeliveryThreshold > 0;
  const hasFreeDeliveryDeal = items.some(
    (it) =>
      (it.type === 'deal' || ('dealId' in it && Boolean(it.dealId))) &&
      'isFreeDelivery' in it &&
      Boolean(it.isFreeDelivery)
  );

  const isFreeDeliveryUnlocked =
    hasFreeDeliveryDeal || (isFreeDeliveryEnabled && totalPhysicalPieces >= shipping.freeDeliveryThreshold);

  const deliveryFee =
    totalPhysicalPieces === 0 ? 0 : isFreeDeliveryUnlocked ? 0 : shipping.baseDeliveryCharge;

  const piecesNeededForFreeDelivery =
    !isFreeDeliveryEnabled || hasFreeDeliveryDeal
      ? 0
      : Math.max(0, shipping.freeDeliveryThreshold - totalPhysicalPieces);

  return {
    totalPhysicalPieces,
    baseDeliveryCharge: shipping.baseDeliveryCharge,
    freeDeliveryThreshold: shipping.freeDeliveryThreshold,
    minOrderQty: shipping.minOrderQty,
    maxOrderQty: shipping.maxOrderQty,
    isFreeDeliveryEnabled,
    hasFreeDeliveryDeal,
    isFreeDeliveryUnlocked,
    deliveryFee,
    piecesNeededForFreeDelivery,
  };
}
