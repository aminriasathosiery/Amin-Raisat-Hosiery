/**
 * Centralized, Authoritative Pricing Engine for Amin Raisat Hosiery
 *
 * Rules:
 * 1. Final Sale Price = Math.round(originalPrice * (1 - discountPercentage / 100))
 * 2. If discount is 0%: Sale Price = Original Price, isOnSale = false (No SALE badge).
 * 3. If discount > 0%: Sale Price < Original Price, isOnSale = true.
 * 4. Allowed discount range: 0% to 99%. Disallow negative values and values >= 100%.
 * 5. Uses strict integer PKR rounding throughout (no decimal currency).
 */

export interface VariantPricingResult {
  originalPrice: number;
  discountPercentage: number;
  salePrice: number;
  isOnSale: boolean;
}

/**
 * Validates a discount percentage input.
 * - Allows 0
 * - Allows valid numbers up to 99%
 * - Rejects negative numbers
 * - Rejects numbers >= 100% (products cannot be 100% free)
 * - Safely handles null, undefined, empty strings, and NaN
 */
export function validateDiscountPercentage(val: unknown): {
  isValid: boolean;
  value: number;
  error?: string;
} {
  if (val === null || val === undefined || val === '') {
    return { isValid: true, value: 0 };
  }

  const num = Number(val);
  if (isNaN(num)) {
    return { isValid: false, value: 0, error: 'Discount must be a valid number.' };
  }

  if (num < 0) {
    return { isValid: false, value: 0, error: 'Discount percentage cannot be negative.' };
  }

  if (num >= 100) {
    return { isValid: false, value: 0, error: 'Discount percentage must be less than 100%.' };
  }

  // Rounded to maximum 2 decimal places for precision input
  const rounded = Math.round(num * 100) / 100;
  return { isValid: true, value: rounded };
}

/**
 * Calculates the final sale price given an original price and discount percentage.
 * Formula: originalPrice * (1 - discountPercentage / 100) rounded to nearest PKR integer.
 */
export function calculateSalePrice(originalPrice: number, discountPercentage: number): number {
  const safeOriginal = Math.max(0, Math.round(Number(originalPrice) || 0));
  const safeDiscount = Math.min(99, Math.max(0, Number(discountPercentage) || 0));

  if (safeDiscount === 0 || safeOriginal === 0) {
    return safeOriginal;
  }

  const sale = Math.round(safeOriginal * (1 - safeDiscount / 100));
  return Math.max(0, sale);
}

/**
 * Derives the discount percentage given an original price and a sale price.
 * Formula: ((originalPrice - salePrice) / originalPrice) * 100 rounded to integer or 1 decimal.
 */
export function calculateDiscountPercentage(originalPrice: number, salePrice: number): number {
  const orig = Math.max(0, Number(originalPrice) || 0);
  const sale = Math.max(0, Number(salePrice) || 0);

  if (orig <= 0 || sale >= orig) {
    return 0;
  }

  const discount = Math.round(((orig - sale) / orig) * 100);
  return Math.min(99, Math.max(0, discount));
}

/**
 * Authoritatively resolves a variant's pricing details.
 * Supports:
 * - Variants with `price` and `discountPercentage`
 * - Legacy variants with `price` and `sale_price` / `salePrice`
 * - Legacy variants with only `price`
 */
export function resolveVariantPricing(variant?: {
  price?: number | string | null;
  salePrice?: number | string | null;
  sale_price?: number | string | null;
  discountPercentage?: number | string | null;
  discount_percentage?: number | string | null;
} | null): VariantPricingResult {
  if (!variant) {
    return {
      originalPrice: 480,
      discountPercentage: 0,
      salePrice: 480,
      isOnSale: false,
    };
  }

  const rawPrice = Number(variant.price);
  const originalPrice = Math.max(0, Math.round(isNaN(rawPrice) ? 480 : rawPrice));

  const explicitDiscount =
    variant.discountPercentage !== undefined && variant.discountPercentage !== null
      ? Number(variant.discountPercentage)
      : variant.discount_percentage !== undefined && variant.discount_percentage !== null
      ? Number(variant.discount_percentage)
      : undefined;

  const rawSalePrice =
    variant.salePrice !== undefined && variant.salePrice !== null
      ? Number(variant.salePrice)
      : variant.sale_price !== undefined && variant.sale_price !== null
      ? Number(variant.sale_price)
      : undefined;

  // Case 1: Explicit discount percentage provided
  if (explicitDiscount !== undefined && !isNaN(explicitDiscount) && explicitDiscount > 0) {
    const validated = validateDiscountPercentage(explicitDiscount);
    const validDiscount = validated.isValid ? validated.value : 0;

    if (validDiscount > 0) {
      const salePrice = calculateSalePrice(originalPrice, validDiscount);
      return {
        originalPrice,
        discountPercentage: validDiscount,
        salePrice,
        isOnSale: salePrice < originalPrice,
      };
    }
  }

  // Case 2: Legacy salePrice provided
  if (rawSalePrice !== undefined && !isNaN(rawSalePrice) && rawSalePrice > 0) {
    const roundedSale = Math.round(rawSalePrice);
    if (roundedSale < originalPrice) {
      const derivedDiscount = calculateDiscountPercentage(originalPrice, roundedSale);
      return {
        originalPrice,
        discountPercentage: derivedDiscount,
        salePrice: roundedSale,
        isOnSale: true,
      };
    }
  }

  // Case 3: No discount or salePrice equals/exceeds originalPrice
  return {
    originalPrice,
    discountPercentage: 0,
    salePrice: originalPrice,
    isOnSale: false,
  };
}

/**
 * Formats a PKR currency value with standard Pakistani Rupee representation.
 */
export function formatPKR(amount: number): string {
  const safe = Math.max(0, Math.round(Number(amount) || 0));
  return `Rs. ${safe.toLocaleString('en-PK')}`;
}
