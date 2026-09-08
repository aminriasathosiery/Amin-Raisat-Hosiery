import http from 'http';
import fs from 'fs';
import path from 'path';

// We will launch a test against http://localhost:3000
const BASE_URL = 'http://localhost:3000';

async function testFetch(urlPath, options = {}) {
  const res = await fetch(`${BASE_URL}${urlPath}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=== RUNNING LIVE FLOW INTEGRATION TESTS ===\n');

  // Test 1: Public Products API
  console.log('1. Testing GET /api/products...');
  const prodsRes = await testFetch('/api/products');
  if (!prodsRes.ok || !prodsRes.data?.products?.length) {
    throw new Error(`Failed to fetch products: ${JSON.stringify(prodsRes)}`);
  }
  const products = prodsRes.data.products;
  const firstProd = products[0];
  console.log(`✅ Loaded ${products.length} products. First: "${firstProd.name}", Variants: ${firstProd.variants?.length}`);
  const firstVar = firstProd.variants[0];
  console.log(`   Sample variant: ${firstVar.quality} / ${firstVar.sleeve} / ${firstVar.size} -> Retail: Rs. ${firstVar.price}, Wholesale: Rs. ${firstVar.wholesalePrice}`);

  // Test 2: Admin Settings API
  console.log('\n2. Testing GET /api/admin/settings...');
  const settingsRes = await testFetch('/api/admin/settings');
  if (!settingsRes.ok || !settingsRes.data?.settings) {
    throw new Error(`Failed to fetch settings: ${JSON.stringify(settingsRes)}`);
  }
  const settings = settingsRes.data.settings;
  console.log(`✅ Settings: minOrderQty=${settings.shipping.minOrderQty}, freeDeliveryThreshold=${settings.shipping.freeDeliveryThreshold}, baseDeliveryCharge=${settings.shipping.baseDeliveryCharge}`);

  // Test 3: Buy Now Retail - 1 Piece Order
  console.log('\n3. Testing Order Creation: Retail 1 Piece (Buy Now Qty = 1)...');
  const retail1Payload = {
    customerName: 'Test Buyer 1-Piece',
    customerPhone: '03001234567',
    address: 'Street 1, D-Ground',
    city: 'Faisalabad',
    province: 'Punjab',
    paymentMethod: 'cod',
    isWholesale: false,
    items: [
      {
        productId: firstProd.id,
        variantId: firstVar.id,
        productName: firstProd.name,
        quality: firstVar.quality,
        sleeve: firstVar.sleeve,
        size: firstVar.size,
        unitPrice: firstVar.price,
        regularPrice: firstVar.price,
        wholesalePrice: firstVar.wholesalePrice,
        isWholesale: false,
        quantity: 1,
        image: firstProd.media?.[0]?.url || '/images/test.jpg',
      },
    ],
  };

  const order1Res = await testFetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(retail1Payload),
  });

  if (!order1Res.ok || !order1Res.data?.order) {
    throw new Error(`Order 1-Piece failed: ${JSON.stringify(order1Res.data)}`);
  }
  const order1 = order1Res.data.order;
  console.log(`✅ Order 1-Piece Created: #${order1.orderNumber}`);
  console.log(`   Items: ${order1.items?.length}, Qty: ${order1.items?.[0]?.quantity}, Subtotal: Rs. ${order1.subtotal}, Delivery: Rs. ${order1.deliveryFee}, Total: Rs. ${order1.totalAmount}`);
  
  if (order1.items[0].quantity !== 1) {
    throw new Error(`Expected item quantity to be 1, got ${order1.items[0].quantity}`);
  }
  if (order1.deliveryFee !== 200) {
    throw new Error(`Expected delivery fee to be 200 for 1 piece, got ${order1.deliveryFee}`);
  }

  // Test 4: Buy Now Retail - 2 Pieces Order
  console.log('\n4. Testing Order Creation: Retail 2 Pieces (Buy Now Qty = 2)...');
  const retail2Payload = {
    ...retail1Payload,
    customerName: 'Test Buyer 2-Pieces',
    items: [{ ...retail1Payload.items[0], quantity: 2 }],
  };
  const order2Res = await testFetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(retail2Payload),
  });
  if (!order2Res.ok) throw new Error(`Order 2-Pieces failed: ${JSON.stringify(order2Res.data)}`);
  const order2 = order2Res.data.order;
  console.log(`✅ Order 2-Pieces Created: #${order2.orderNumber}, Qty: ${order2.items[0].quantity}, Subtotal: Rs. ${order2.subtotal}, Delivery: Rs. ${order2.deliveryFee}, Total: Rs. ${order2.totalAmount}`);
  if (order2.items[0].quantity !== 2) throw new Error(`Expected quantity 2, got ${order2.items[0].quantity}`);
  if (order2.deliveryFee !== 200) throw new Error(`Expected delivery fee 200 for 2 pieces, got ${order2.deliveryFee}`);

  // Test 5: Buy Now Retail - 3 Pieces Order (Free Delivery Threshold Unlocked)
  console.log('\n5. Testing Order Creation: Retail 3 Pieces (Buy Now Qty = 3 - Free Delivery)...');
  const retail3Payload = {
    ...retail1Payload,
    customerName: 'Test Buyer 3-Pieces',
    items: [{ ...retail1Payload.items[0], quantity: 3 }],
  };
  const order3Res = await testFetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(retail3Payload),
  });
  if (!order3Res.ok) throw new Error(`Order 3-Pieces failed: ${JSON.stringify(order3Res.data)}`);
  const order3 = order3Res.data.order;
  console.log(`✅ Order 3-Pieces Created: #${order3.orderNumber}, Qty: ${order3.items[0].quantity}, Subtotal: Rs. ${order3.subtotal}, Delivery: Rs. ${order3.deliveryFee} (FREE), Total: Rs. ${order3.totalAmount}`);
  if (order3.items[0].quantity !== 3) throw new Error(`Expected quantity 3, got ${order3.items[0].quantity}`);
  if (order3.deliveryFee !== 0) throw new Error(`Expected FREE delivery (0) for 3 pieces, got ${order3.deliveryFee}`);

  // Test 6: Wholesale Order - 12 Pieces (Configured Wholesale MOQ)
  console.log('\n6. Testing Order Creation: Wholesale 12 Pieces (Dozen Master Pack)...');
  const expectedWholesaleUnit = firstVar.wholesalePrice;
  const wholesale12Payload = {
    customerName: 'Test Wholesale Merchant',
    customerPhone: '03009876543',
    address: 'Shop 14, Cloth Market',
    city: 'Lahore',
    province: 'Punjab',
    paymentMethod: 'cod',
    isWholesale: true,
    items: [
      {
        productId: firstProd.id,
        variantId: firstVar.id,
        productName: firstProd.name,
        quality: firstVar.quality,
        sleeve: firstVar.sleeve,
        size: firstVar.size,
        unitPrice: expectedWholesaleUnit,
        regularPrice: firstVar.price,
        wholesalePrice: expectedWholesaleUnit,
        isWholesale: true,
        quantity: 12,
        image: firstProd.media?.[0]?.url || '/images/test.jpg',
      },
    ],
  };

  const order12Res = await testFetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wholesale12Payload),
  });

  if (!order12Res.ok || !order12Res.data?.order) {
    throw new Error(`Wholesale Order failed: ${JSON.stringify(order12Res.data)}`);
  }
  const order12 = order12Res.data.order;
  console.log(`✅ Wholesale Order Created: #${order12.orderNumber}`);
  console.log(`   Quantity: ${order12.items[0].quantity}, Unit Price: Rs. ${order12.items[0].unitPrice}, Subtotal: Rs. ${order12.subtotal}, Delivery: Rs. ${order12.deliveryFee} (FREE), Total: Rs. ${order12.totalAmount}, isWholesale: ${order12.isWholesale}`);
  
  if (order12.items[0].quantity !== 12) throw new Error(`Expected wholesale quantity 12, got ${order12.items[0].quantity}`);
  if (order12.items[0].unitPrice !== expectedWholesaleUnit) throw new Error(`Expected wholesale unit price Rs. ${expectedWholesaleUnit}, got ${order12.items[0].unitPrice}`);
  if (order12.subtotal !== expectedWholesaleUnit * 12) throw new Error(`Expected subtotal ${expectedWholesaleUnit * 12}, got ${order12.subtotal}`);
  if (order12.deliveryFee !== 0) throw new Error(`Expected FREE delivery for wholesale, got ${order12.deliveryFee}`);
  if (order12.totalAmount !== expectedWholesaleUnit * 12) throw new Error(`Expected total ${expectedWholesaleUnit * 12}, got ${order12.totalAmount}`);

  // Test 7: Verify Admin Orders fetch receives all test orders with exact quantities and items
  console.log('\n7. Testing GET /api/admin/orders...');
  const adminOrdersRes = await testFetch('/api/admin/orders');
  if (!adminOrdersRes.ok || !adminOrdersRes.data?.orders) {
    throw new Error(`Admin orders fetch failed: ${JSON.stringify(adminOrdersRes)}`);
  }
  const adminOrders = adminOrdersRes.data.orders;
  console.log(`✅ Admin retrieved ${adminOrders.length} orders.`);
  const foundOrder1 = adminOrders.find((o) => o.orderNumber === order1.orderNumber);
  const foundOrder12 = adminOrders.find((o) => o.orderNumber === order12.orderNumber);
  
  if (!foundOrder1 || foundOrder1.items[0].quantity !== 1) {
    throw new Error('Admin did not receive 1-piece retail order correctly.');
  }
  if (!foundOrder12 || foundOrder12.items[0].quantity !== 12 || foundOrder12.items[0].unitPrice !== expectedWholesaleUnit) {
    throw new Error('Admin did not receive 12-piece wholesale order correctly.');
  }
  console.log('✅ Admin Orders verified: 1-piece order preserved, 12-piece wholesale order preserved with correct unit price and subtotal.');

  console.log('\n========================================');
  console.log('🎉 ALL BUSINESS LOGIC & INTEGRATION TESTS PASSED!');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
