import { Product, ProductMedia } from '@/types';

const FALLBACK_PRODUCT_IMAGE = '/images/products/sleevless high.jpeg';

function normalizeUrl(url?: string | null): string {
  return (url || '').trim();
}

function isGalleryPhoto(m: ProductMedia): boolean {
  const mType = m.type || (m as any).media_type || 'photo';
  return mType !== 'video' && mType !== 'size_guide';
}

/**
 * Resolves the authoritative cover/display photo for product cards and cart items.
 * - When `preferColor` is omitted (default listing view): uses `product.coverImage` FIRST,
 *   then falls back safely to general/first gallery photos for legacy products.
 * - When `preferColor` is explicitly selected: uses that color's primary image or matching media,
 *   falling back to primary cover if that color has no dedicated image yet.
 */
export function resolvePrimaryCoverImage(
  product: Pick<Product, 'coverImage' | 'colors' | 'media'>,
  preferColor?: string,
  preferSleeve?: string
): string {
  const photos = (product.media || []).filter(isGalleryPhoto);

  if (preferColor) {
    const lowerTarget = preferColor.trim().toLowerCase();
    const colorObj = (product.colors || []).find(
      (c) => (c.name || '').trim().toLowerCase() === lowerTarget
    );
    if (normalizeUrl(colorObj?.image)) {
      return normalizeUrl(colorObj!.image);
    }

    if (preferSleeve) {
      const sleeveMatch = photos.find(
        (m) =>
          (m.color || '').trim().toLowerCase() === lowerTarget &&
          (m.variantSleeve === preferSleeve || m.variantSleeve === 'All' || !m.variantSleeve)
      );
      if (normalizeUrl(sleeveMatch?.url)) return normalizeUrl(sleeveMatch!.url);
    }

    const colorPhoto = photos.find((m) => (m.color || '').trim().toLowerCase() === lowerTarget);
    if (normalizeUrl(colorPhoto?.url)) return normalizeUrl(colorPhoto!.url);
  }

  // Primary explicit Cover Image always wins in default view
  if (normalizeUrl(product.coverImage)) {
    return normalizeUrl(product.coverImage);
  }

  // Legacy fallback: general photo (not tied to a specific color) -> sleeve match -> first photo -> color photo
  const generalPhotos = photos.filter((m) => !m.color);
  if (preferSleeve && generalPhotos.length > 0) {
    const sleeveGeneral = generalPhotos.find(
      (m) => !m.variantSleeve || m.variantSleeve === 'All' || m.variantSleeve === preferSleeve
    );
    if (normalizeUrl(sleeveGeneral?.url)) return normalizeUrl(sleeveGeneral!.url);
  }
  if (generalPhotos[0] && normalizeUrl(generalPhotos[0].url)) {
    return normalizeUrl(generalPhotos[0].url);
  }

  if (photos[0] && normalizeUrl(photos[0].url)) {
    return normalizeUrl(photos[0].url);
  }

  const firstColorImg = (product.colors || []).find((c) => normalizeUrl(c.image))?.image;
  if (normalizeUrl(firstColorImg)) {
    return normalizeUrl(firstColorImg);
  }

  return FALLBACK_PRODUCT_IMAGE;
}

/**
 * Resolves the ordered ProductGallery photo list.
 * - Default view (`!selectedColor`): displays `coverImage` first, followed by general/gallery photos.
 * - Selected color view (`selectedColor`): displays that color's primary image + additional images + color media.
 */
export function resolveProductGalleryMedia(
  product: Pick<Product, 'name' | 'coverImage' | 'colors' | 'media'>,
  selectedColor?: string,
  selectedSleeve?: string
): ProductMedia[] {
  const photos = (product.media || []).filter(isGalleryPhoto);
  const seenUrls = new Set<string>();
  const result: ProductMedia[] = [];

  const pushUnique = (item: ProductMedia) => {
    const clean = normalizeUrl(item.url);
    if (!clean || seenUrls.has(clean)) return;
    seenUrls.add(clean);
    result.push({ ...item, url: clean });
  };

  if (selectedColor) {
    const lowerTarget = selectedColor.trim().toLowerCase();
    const colorObj = (product.colors || []).find(
      (c) => (c.name || '').trim().toLowerCase() === lowerTarget
    );

    if (normalizeUrl(colorObj?.image)) {
      pushUnique({
        id: `color-primary-${colorObj!.id || colorObj!.name}`,
        type: 'photo',
        url: normalizeUrl(colorObj!.image),
        alt: `${product.name} - ${colorObj!.name}`,
        title: `${colorObj!.name} Primary Photo`,
        color: colorObj!.name,
      });
    }

    if (Array.isArray(colorObj?.additionalImages)) {
      colorObj!.additionalImages.forEach((imgUrl, idx) => {
        if (normalizeUrl(imgUrl)) {
          pushUnique({
            id: `color-extra-${colorObj!.id || colorObj!.name}-${idx}`,
            type: 'photo',
            url: normalizeUrl(imgUrl),
            alt: `${product.name} - ${colorObj!.name} view ${idx + 1}`,
            title: `${colorObj!.name} Gallery`,
            color: colorObj!.name,
          });
        }
      });
    }

    const matchingColorPhotos = photos.filter(
      (m) => (m.color || '').trim().toLowerCase() === lowerTarget
    );
    if (selectedSleeve) {
      matchingColorPhotos
        .filter((m) => m.variantSleeve === selectedSleeve || m.variantSleeve === 'All' || !m.variantSleeve)
        .forEach(pushUnique);
    }
    matchingColorPhotos.forEach(pushUnique);

    // If selected color already has dedicated images, return strictly that color's gallery
    if (result.length > 0) {
      return result;
    }
  }

  // Default / Cover state (or fallback when selected color has no images yet)
  if (normalizeUrl(product.coverImage)) {
    pushUnique({
      id: 'primary-cover-image',
      type: 'photo',
      url: normalizeUrl(product.coverImage),
      alt: `${product.name} Primary Cover`,
      title: 'Primary Cover Image',
    });
  }

  if (selectedSleeve) {
    photos
      .filter((m) => !m.color && (m.variantSleeve === selectedSleeve || m.variantSleeve === 'All'))
      .forEach(pushUnique);
  }

  photos.filter((m) => !m.color).forEach(pushUnique);
  if (result.length === 0) {
    photos.forEach(pushUnique);
  }

  return result;
}

