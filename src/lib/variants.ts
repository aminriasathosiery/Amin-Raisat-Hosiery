import { ProductVariant } from '@/types';

export function normalizeVariantText(value?: string | null): string {
  return (value || '').trim();
}

export function getVariantComboKey(variant: {
  quality?: string | null;
  sleeve?: string | null;
  size?: string | null;
  color?: string | null;
}): string {
  const quality = normalizeVariantText(variant.quality || 'High Quality').toLowerCase();
  const sleeve = normalizeVariantText(variant.sleeve || 'Sleeveless').toLowerCase();
  const size = normalizeVariantText(variant.size || 'L').toLowerCase();
  const color = normalizeVariantText(variant.color).toLowerCase();
  return `${quality}::${sleeve}::${size}::${color}`;
}

export interface VariantValidationResult {
  valid: boolean;
  error?: string;
  duplicateDescription?: string;
}

/**
 * Validates that no two variants share the same normalized (quality, sleeve, size, color) key.
 */
export function validateVariantCombinations(
  variants: Array<{
    quality?: string | null;
    sleeve?: string | null;
    size?: string | null;
    color?: string | null;
  }>
): VariantValidationResult {
  const seen = new Set<string>();
  for (const v of variants) {
    const key = getVariantComboKey(v);
    if (seen.has(key)) {
      const colorLabel = normalizeVariantText(v.color);
      const desc = `${colorLabel ? `${colorLabel} / ` : ''}${normalizeVariantText(v.size || 'L')} (${normalizeVariantText(v.quality || 'High Quality')} • ${normalizeVariantText(v.sleeve || 'Sleeveless')})`;
      return {
        valid: false,
        duplicateDescription: desc,
        error: `Duplicate color and size combination (${desc}). Please check your variants.`,
      };
    }
    seen.add(key);
  }
  return { valid: true };
}

/**
 * Ensures all SKUs within a variant list are non-empty and unique (case-insensitive),
 * optionally disambiguating against existing external SKUs in the catalog.
 */
export function ensureUniqueVariantSkus<
  T extends {
    sku?: string | null;
    quality?: string | null;
    sleeve?: string | null;
    size?: string | null;
    color?: string | null;
  }
>(variants: T[], productPrefix = 'ARH', externalSkus?: Set<string>): T[] {
  const used = new Set<string>(externalSkus ? Array.from(externalSkus).map((s) => s.toUpperCase()) : []);

  return variants.map((v, idx) => {
    const qShort = (v.quality || 'HQ')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3) || 'HQ';
    const stShort = (v.sleeve || 'SL')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3) || 'SL';
    const colShort = v.color
      ? v.color.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4)
      : '';
    const szShort = (v.size || 'L').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || String(idx + 1);

    let candidate = (v.sku || '').trim();
    if (!candidate) {
      candidate = colShort
        ? `${productPrefix}-${colShort}-${qShort}-${stShort}-${szShort}`
        : `${productPrefix}-${qShort}-${stShort}-${szShort}`;
    }

    let finalSku = candidate;
    let suffix = 2;
    while (used.has(finalSku.toUpperCase())) {
      finalSku = `${candidate}-${suffix}`;
      suffix++;
    }
    used.add(finalSku.toUpperCase());

    return {
      ...v,
      sku: finalSku,
    };
  });
}

