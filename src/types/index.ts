export type QualityType = string;
export type SleeveType = string;
export type ProductSize = string;

export interface QualityBreakdown {
  neck: string;
  shoulders: string;
  stitching: string;
  feel: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  displayOrder: number;
  productCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  displayOrder: number;
  subcategories?: Subcategory[];
  productCount?: number;
}

export type ThemeMode = 'dark' | 'light';

export interface ProductVariant {
  id: string;
  productId?: string;
  quality: QualityType;
  sleeve: SleeveType;
  size: ProductSize;
  price: number; // Original retail reference price
  discountPercentage?: number; // Discount percentage (e.g. 10 for 10%)
  salePrice?: number; // Final sale price after discount
  stock: number;
  sku?: string;
  isAvailable: boolean;
}

export interface ProductMedia {
  id: string;
  productId?: string;
  type: 'photo' | 'video' | 'size_guide';
  url: string;
  alt?: string;
  title?: string;
  displayOrder?: number;
  variantQuality?: QualityType;
  variantSleeve?: SleeveType;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId?: string;
  orderId?: string;
  customerName: string;
  customerCity?: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  name: string;
  slug: string;
  subtitle: string;
  shortDescription?: string;
  description: string;
  features: string[];
  qualityComparison?: {
    highQuality?: QualityBreakdown;
    standardQuality?: QualityBreakdown;
  };
  careInstructions: string[];
  shippingInfo: string;
  returnPolicy?: string;
  videoUrl?: string;
  sizeGuideUrl?: string;
  rating?: number;
  reviewsCount?: number;
  isPublished: boolean;
  sortOrder?: number;
  createdAt: string;
  variants: ProductVariant[];
  media: ProductMedia[];
  reviews?: ProductReview[];
}

// ============================================================================
// DEALS / BUNDLES SYSTEM
// ============================================================================

export interface Deal {
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  piecesCount: number;          // Physical pieces bundled in 1 deal unit
  originalPrice: number;        // Original price before discount
  discountPercentage: number;   // Discount % (0 = no discount)
  salePrice: number;            // Final price = originalPrice * (1 - discountPercentage/100)
  isFreeDelivery: boolean;      // If true, delivery is always Rs. 0
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  badgeText?: string;           // e.g. "Best Value", "Hot Deal"
  createdAt: string;
}

export interface DealCartItem {
  id: string;               // unique cart item id
  type: 'deal';
  dealId: string;
  dealName: string;
  dealSlug: string;
  dealImage?: string;
  piecesCount: number;
  originalPrice: number;
  discountPercentage: number;
  unitPrice: number;        // = salePrice (per deal unit)
  quantity: number;         // deal units ordered
  isFreeDelivery: boolean;
  size: string; // empty string for deals
}

export interface ProductCartItem {
  id: string;
  type: 'product';
  productId: string;
  variantId?: string;
  productName: string;
  productSlug: string;
  quality: QualityType;
  sleeve: SleeveType;
  size: ProductSize;
  unitPrice: number; // Authoritative final sale price
  originalPrice?: number; // Original price before discount
  discountPercentage?: number; // Discount percentage applied
  quantity: number;
  image: string;
}

export type CartItem = DealCartItem | ProductCartItem;

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

export type PaymentMethodType = 'cod' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'sadapay';

export type PaymentStatusType =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'COD_PENDING';

export interface OrderItem {
  id: string;
  orderId: string;
  // Product fields
  productId?: string;
  variantId?: string;
  productName?: string;
  quality?: QualityType;
  sleeve?: SleeveType;
  size?: ProductSize;
  // Deal fields
  dealId?: string;
  dealName?: string;
  dealSlug?: string;
  piecesCount?: number;
  isFreeDelivery?: boolean;
  // Common fields
  unitPrice: number; // Final transaction unit price paid
  originalPrice?: number; // Original reference price at time of order
  discountPercentage?: number; // Discount percentage at time of order
  quantity: number;
  totalPrice: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerType?: 'GUEST' | 'REGISTERED';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  billingAddress?: string;
  city: string;
  province: string;
  orderNotes?: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  paymentStatus?: PaymentStatusType;
  paymentScreenshotUrl?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  paymentRejectionReason?: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
}

export interface ShippingSettings {
  minOrderQty: number;
  maxOrderQty: number;
  baseDeliveryCharge: number;
  freeDeliveryThreshold: number;
}

export interface BankAccountDetails {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
  instructions?: string;
}

export interface PaymentMethodConfig {
  enabled: boolean;
  displayName: string;
  instructions?: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
  branch?: string;
  description?: string;
}

export interface PaymentMethodsSettings {
  cod: PaymentMethodConfig;
  bank_transfer: PaymentMethodConfig;
  jazzcash: PaymentMethodConfig;
  easypaisa: PaymentMethodConfig;
  sadapay: PaymentMethodConfig;
  [key: string]: PaymentMethodConfig;
}

export interface AnnouncementStrip {
  id: string;
  text: string;
  link?: string;
  isActive: boolean;
  displayOrder: number;
  icon?: string;
}

export interface SiteSettings {
  brandName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address?: string;
  businessHours?: string;
  market: string;
  currency: string;
  shipping: ShippingSettings;
  bankDetails: BankAccountDetails;
  paymentMethods?: PaymentMethodsSettings;
  announcementStrips?: AnnouncementStrip[];
  isStoreOpen: boolean;
  isCodEnabled: boolean;
  isBankTransferEnabled: boolean;
  isAnnouncementEnabled: boolean;
  announcementText?: string;
  isWhatsAppFloatingEnabled: boolean;
  exchangeReturnDays: number;
}

export interface HeroSlide {
  id: string;
  deviceType?: 'desktop' | 'mobile';
  title?: string;
  subtitle?: string;
  badge?: string;
  desktopImage: string;
  mobileImage?: string;
  buttonText?: string;
  buttonLink?: string;
  link?: string;
  textColor?: 'light' | 'dark';
  displayOrder: number;
  isActive: boolean;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerAddress {
  id: string;
  userId: string;
  addressType: 'shipping' | 'billing';
  fullName?: string;
  phone?: string;
  address?: string;
  streetAddress?: string;
  city: string;
  province: string;
  postalCode?: string;
  country?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerRecord {
  id: string; // Auth User UUID
  fullName: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
  addresses: CustomerAddress[];
  orders: Order[];
  totalSpent: number;
  totalOrders: number;
}
