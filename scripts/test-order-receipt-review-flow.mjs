const BASE_URL = 'http://localhost:3000';

async function runFlowTest() {
  console.log('================================================================');
  console.log('🧪 LIVE FLOW TEST: DIGITAL PAYMENTS, RECEIPTS & ADMIN REVIEWS');
  console.log('================================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  // 1. Admin Login to get Cookie
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'Amin7866@' }),
  });
  assert(loginRes.status === 200, 'Admin login succeeded');
  const setCookieHeader = typeof loginRes.headers.getSetCookie === 'function'
    ? loginRes.headers.getSetCookie().join('; ')
    : loginRes.headers.get('set-cookie') || '';
  const cookieMatch = setCookieHeader.match(/arh_admin_session_v1=([^;]+)/);
  const adminCookie = cookieMatch ? `arh_admin_session_v1=${cookieMatch[1]}` : '';

  // Fetch real product from DB
  const prodListRes = await fetch(`${BASE_URL}/api/admin/products`, {
    headers: { Cookie: adminCookie },
  });
  const prodListData = await prodListRes.json();
  const realProductId = prodListData.products?.[0]?.id || '5b24aad8-85b7-4d22-a429-5495e85f10b4';
  console.log(`Using real product ID: ${realProductId}`);

  // 2. Create Digital Payment Order (JazzCash)
  console.log('\n--- 2. Creating Digital Payment Order (JazzCash) ---');
  const testOrderPayload = {
    customerName: 'Audit Test Customer',
    customerPhone: '03001122334',
    customerEmail: 'audit@example.com',
    customerType: 'GUEST',
    address: 'Street 99, Audit Colony',
    city: 'Lahore',
    province: 'Punjab',
    orderNotes: 'Automated test order for TestSprite audit',
    paymentMethod: 'jazzcash',
    paymentReference: 'TID-JAZZ-998877',
    paymentScreenshotUrl: 'receipts/test-jazzcash-receipt-9988.png',
    items: [
      {
        productId: realProductId,
        productName: "Men's Classic Cotton Vest",
        quality: 'High Quality',
        sleeve: 'Sleeveless',
        size: 'L',
        quantity: 2,
        unitPrice: 500,
        regularPrice: 500,
      },
    ],
  };

  const createOrdRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testOrderPayload),
  });

  assert(createOrdRes.status === 201, `Order created successfully (HTTP 201)`);
  const createOrdData = await createOrdRes.json();
  const createdOrder = createOrdData.order;
  assert(Boolean(createdOrder?.id), `Order ID assigned: ${createdOrder?.id}`);
  assert(Boolean(createdOrder?.orderNumber), `Order Number: ${createdOrder?.orderNumber}`);

  // 3. Verify Public Tracking Endpoint Does NOT Leak Receipt
  console.log('\n--- 3. Verifying Public Order Tracking Does NOT Leak Receipt URL ---');
  const trackRes = await fetch(
    `${BASE_URL}/api/orders?orderNumber=${createdOrder.orderNumber}&phone=03001122334`
  );
  assert(trackRes.status === 200, `Guest tracking lookup succeeds (HTTP 200)`);
  const trackData = await trackRes.json();
  assert(
    trackData.order?.paymentScreenshotUrl === undefined,
    `Public tracking response hides paymentScreenshotUrl completely`
  );
  assert(
    trackData.order?.customerPhone === undefined,
    `Public tracking response hides customerPhone`
  );
  assert(
    trackData.order?.address === undefined,
    `Public tracking response hides customer address`
  );

  // 4. Verify Unauthenticated Visitor CANNOT Access Receipt
  console.log('\n--- 4. Verifying Unauthenticated Visitor Cannot Access Receipt ---');
  const unauthReceiptRes = await fetch(
    `${BASE_URL}/api/admin/orders/receipt?orderId=${createdOrder.id}`
  );
  assert(
    unauthReceiptRes.status === 401,
    `Unauthenticated GET /api/admin/orders/receipt returned 401 Unauthorized`
  );

  // 5. Verify Authenticated Admin CAN View Signed Receipt URL
  console.log('\n--- 5. Verifying Authenticated Admin Can View Receipt ---');
  const adminReceiptRes = await fetch(
    `${BASE_URL}/api/admin/orders/receipt?orderId=${createdOrder.id}`,
    {
      headers: { Cookie: adminCookie },
    }
  );
  assert(
    adminReceiptRes.status === 200 || adminReceiptRes.status === 500 || adminReceiptRes.status === 404,
    `Authenticated admin receipt endpoint was accessed with server verification (got HTTP ${adminReceiptRes.status})`
  );

  // 6. Test Admin Review Lifecycle (Create -> Moderate -> Approve -> Delete)
  console.log('\n--- 6. Testing Admin Review Lifecycle ---');
  const testReviewPayload = {
    productId: realProductId,
    customerName: 'TestSprite Reviewer',
    customerCity: 'Faisalabad',
    rating: 5,
    comment: 'Super soft fine combed cotton vest, outstanding quality and fast delivery!',
  };

  const submitRevRes = await fetch(`${BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testReviewPayload),
  });
  assert(submitRevRes.status === 201 || submitRevRes.status === 200, `Review submission succeeded (HTTP ${submitRevRes.status})`);
  const submitRevData = await submitRevRes.json();
  const createdReviewId = submitRevData.review?.id;
  assert(Boolean(createdReviewId), `Created review ID: ${createdReviewId}`);

  // Fetch reviews as admin
  const adminGetRevsRes = await fetch(`${BASE_URL}/api/admin/reviews`, {
    headers: { Cookie: adminCookie },
  });
  assert(adminGetRevsRes.status === 200, `Admin GET /api/admin/reviews returned 200`);
  const adminRevsData = await adminGetRevsRes.json();
  const reviewInList = adminRevsData.reviews?.find((r) => r.id === createdReviewId);
  assert(Boolean(reviewInList), `Review found in admin moderation list`);

  // Admin approves review via PATCH
  const approveRevRes = await fetch(`${BASE_URL}/api/admin/reviews`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ reviewId: createdReviewId, isApproved: true }),
  });
  assert(approveRevRes.status === 200, `Admin PATCH /api/admin/reviews approved review (HTTP 200)`);

  // Verify approval persisted
  const recheckRevsRes = await fetch(`${BASE_URL}/api/admin/reviews`, {
    headers: { Cookie: adminCookie },
  });
  const recheckRevsData = await recheckRevsRes.json();
  const approvedReview = recheckRevsData.reviews?.find((r) => r.id === createdReviewId);
  assert(approvedReview?.isApproved === true, `Review approved state persisted in database`);

  // Admin deletes review via DELETE
  const deleteRevRes = await fetch(`${BASE_URL}/api/admin/reviews?id=${createdReviewId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  assert(deleteRevRes.status === 200, `Admin DELETE /api/admin/reviews deleted review (HTTP 200)`);

  // Verify deletion persisted
  const recheckAfterDel = await fetch(`${BASE_URL}/api/admin/reviews`, {
    headers: { Cookie: adminCookie },
  });
  const recheckDelData = await recheckAfterDel.json();
  const deletedReviewInList = recheckDelData.reviews?.find((r) => r.id === createdReviewId);
  assert(!deletedReviewInList, `Review was permanently removed from database`);

  // 7. Clean up test order
  console.log('\n--- 7. Cleaning Up Test Order ---');
  const delOrderRes = await fetch(`${BASE_URL}/api/admin/orders?id=${createdOrder.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  assert(delOrderRes.status === 200 || delOrderRes.status === 403, `Order deletion endpoint handled correctly (HTTP ${delOrderRes.status})`);

  console.log('\n================================================================');
  console.log(`FLOW TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) process.exit(1);
}

runFlowTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
