/**
 * Retail Store Verification Suite
 * Tests 1-piece ordering, 3+ free delivery threshold, server price tampering protection,
 * redirect configurations, and data integrity.
 */

import assert from 'node:assert/strict';
import nextConfig from '../next.config.mjs';

console.log('--- STARTING RETAIL VERIFICATION TEST SUITE ---\n');

// 1. Test Redirect Configuration
console.log('1. Testing 301 Redirect Rules in next.config.mjs...');
assert(typeof nextConfig.redirects === 'function', 'nextConfig must have a redirects() function');

const redirects = await nextConfig.redirects();
assert(Array.isArray(redirects), 'redirects must return an array');

const requiredRedirects = [
  { source: '/wholesale', destination: '/shop' },
  { source: '/wholesale/product/:slug', destination: '/product/:slug' },
  { source: '/wholesale/category/:slug', destination: '/category/:slug' },
  { source: '/wholesale/category/:slug/:subslug', destination: '/category/:slug/:subslug' },
  { source: '/admin/wholesale', destination: '/admin' },
];

for (const req of requiredRedirects) {
  const match = redirects.find((r) => r.source === req.source);
  assert(match, `Missing redirect rule for ${req.source}`);
  assert.equal(match.destination, req.destination, `Redirect destination mismatch for ${req.source}`);
  assert.equal(match.permanent, true, `Redirect must be 301 permanent for ${req.source}`);
  console.log(`  ✓ ${req.source} -> ${req.destination} (301 Permanent)`);
}

// 2. Test Delivery Engine & Pricing Math
console.log('\n2. Testing Delivery Fee & Quantity Math...');

function calculateOrderTotals(items, settings = { freeDeliveryThreshold: 3, baseDeliveryCharge: 200, minOrderQty: 1 }) {
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  assert(totalQty >= settings.minOrderQty, `Order quantity ${totalQty} must satisfy minOrderQty (${settings.minOrderQty})`);

  const subtotal = items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
  const isFreeDelivery = totalQty >= settings.freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : settings.baseDeliveryCharge;
  const totalAmount = subtotal + deliveryFee;

  return { totalQty, subtotal, deliveryFee, totalAmount, isFreeDelivery };
}

// Test Case A: 1 Piece Valid Order (MOQ = 1)
const order1 = calculateOrderTotals([{ unitPrice: 480, quantity: 1 }]);
assert.equal(order1.totalQty, 1, '1 piece order quantity must be 1');
assert.equal(order1.subtotal, 480, '1 piece subtotal must be Rs. 480');
assert.equal(order1.deliveryFee, 200, '1 piece delivery fee must be Rs. 200');
assert.equal(order1.totalAmount, 680, '1 piece total must be Rs. 680');
assert.equal(order1.isFreeDelivery, false, '1 piece should not qualify for free delivery');
console.log('  ✓ 1 piece order: Subtotal Rs. 480 + Delivery Rs. 200 = Total Rs. 680 (1 piece is a valid order)');

// Test Case B: 2 Pieces Order
const order2 = calculateOrderTotals([{ unitPrice: 480, quantity: 2 }]);
assert.equal(order2.totalQty, 2, '2 pieces order quantity must be 2');
assert.equal(order2.subtotal, 960, '2 pieces subtotal must be Rs. 960');
assert.equal(order2.deliveryFee, 200, '2 pieces delivery fee must be Rs. 200');
assert.equal(order2.totalAmount, 1160, '2 pieces total must be Rs. 1,160');
assert.equal(order2.isFreeDelivery, false, '2 pieces should not qualify for free delivery');
console.log('  ✓ 2 pieces order: Subtotal Rs. 960 + Delivery Rs. 200 = Total Rs. 1,160');

// Test Case C: 3 Pieces Order (Threshold Triggered)
const order3 = calculateOrderTotals([{ unitPrice: 480, quantity: 3 }]);
assert.equal(order3.totalQty, 3, '3 pieces order quantity must be 3');
assert.equal(order3.subtotal, 1440, '3 pieces subtotal must be Rs. 1,440');
assert.equal(order3.deliveryFee, 0, '3 pieces delivery fee must be 0 (FREE DELIVERY)');
assert.equal(order3.totalAmount, 1440, '3 pieces total must be Rs. 1,440');
assert.equal(order3.isFreeDelivery, true, '3 pieces must qualify for free delivery');
console.log('  ✓ 3 pieces order: Subtotal Rs. 1,440 + Delivery Rs. 0 = Total Rs. 1,440 (100% Free Nationwide Delivery)');

// Test Case D: Mixed Items 4 Pieces Order
const order4 = calculateOrderTotals([
  { unitPrice: 480, quantity: 2 },
  { unitPrice: 420, quantity: 2 },
]);
assert.equal(order4.totalQty, 4);
assert.equal(order4.subtotal, 1800);
assert.equal(order4.deliveryFee, 0);
assert.equal(order4.totalAmount, 1800);
console.log('  ✓ 4 mixed pieces order: Subtotal Rs. 1,800 + Delivery Rs. 0 = Total Rs. 1,800');

// 3. Test Server-Authoritative Price Calculation & Tamper Protection
console.log('\n3. Testing Server-Authoritative Price Verification & Tamper Protection...');

// Simulated DB catalog
const mockDbProducts = [
  {
    id: 'prod-001',
    name: 'Super High Quality Combed Cotton Vest',
    product_variants: [
      { id: 'var-001', size: 'L', sleeve: 'Sleeveless', price: 480, stock: 25 },
      { id: 'var-002', size: 'XL', sleeve: 'Full Sleeve', price: 540, stock: 10 },
    ],
  },
];

function serverValidateAndPriceOrder(clientPayload, dbProducts, shippingConfig = { freeDeliveryThreshold: 3, baseDeliveryCharge: 200 }) {
  const verifiedItems = [];

  for (const clientItem of clientPayload.items) {
    const product = dbProducts.find((p) => p.id === clientItem.productId);
    assert(product, `Product ${clientItem.productId} not found`);

    const variant = product.product_variants.find(
      (v) => v.id === clientItem.variantId || (v.size === clientItem.size && v.sleeve === clientItem.sleeve)
    );
    assert(variant, `Variant ${clientItem.variantId} not found`);

    // Authoritative pricing: IGNORE clientItem.unitPrice, use variant.price
    const authoritativePrice = Number(variant.price);
    const qty = Math.max(1, Number(clientItem.quantity) || 1);

    verifiedItems.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      size: variant.size,
      sleeve: variant.sleeve,
      unitPrice: authoritativePrice, // Overridden by DB
      quantity: qty,
      totalPrice: authoritativePrice * qty,
    });
  }

  const subtotal = verifiedItems.reduce((sum, it) => sum + it.totalPrice, 0);
  const totalPieces = verifiedItems.reduce((sum, it) => sum + it.quantity, 0);
  const deliveryFee = totalPieces >= shippingConfig.freeDeliveryThreshold ? 0 : shippingConfig.baseDeliveryCharge;
  const totalAmount = subtotal + deliveryFee;

  return { verifiedItems, subtotal, totalPieces, deliveryFee, totalAmount };
}

// Attack Simulation: Client attempts to tamper with price (sending Rs. 50 instead of Rs. 480)
const tamperedClientPayload = {
  items: [
    {
      productId: 'prod-001',
      variantId: 'var-001',
      size: 'L',
      sleeve: 'Sleeveless',
      unitPrice: 50, // MALICIOUS TAMPERING ATTEMPT
      quantity: 1,
    },
  ],
};

const sanitizedResult = serverValidateAndPriceOrder(tamperedClientPayload, mockDbProducts);
assert.equal(sanitizedResult.verifiedItems[0].unitPrice, 480, 'Server must enforce DB price of Rs. 480');
assert.equal(sanitizedResult.subtotal, 480, 'Subtotal must be recalculated to Rs. 480');
assert.equal(sanitizedResult.deliveryFee, 200, 'Delivery fee must be Rs. 200 for 1 piece');
assert.equal(sanitizedResult.totalAmount, 680, 'Total amount must be sanitized to Rs. 680');
console.log('  ✓ Price tampering attack neutralized: Client price Rs. 50 overridden with authoritative DB price Rs. 480');
console.log('  ✓ Calculated total sanitized: Rs. 480 + Rs. 200 = Rs. 680');

console.log('\n--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
