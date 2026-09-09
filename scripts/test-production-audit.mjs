const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('🛡️ RUNNING PRODUCTION SECURITY & API AUDIT TEST SUITE');
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

  // -------------------------------------------------------------
  // 1. UNAUTHENTICATED ENDPOINT ACCESS MUST BE 401
  // -------------------------------------------------------------
  console.log('--- 1. Testing Unauthenticated Access to Administrative APIs ---');

  const protectedEndpoints = [
    { method: 'GET', url: '/api/admin/orders' },
    { method: 'DELETE', url: '/api/admin/orders?id=test-id' },
    { method: 'PATCH', url: '/api/admin/orders', body: { orderId: '123', status: 'Confirmed' } },
    { method: 'GET', url: '/api/admin/products' },
    { method: 'POST', url: '/api/admin/products', body: { name: 'Unauthorized Test' } },
    { method: 'DELETE', url: '/api/admin/products?id=test-id' },
    { method: 'GET', url: '/api/admin/settings' },
    { method: 'POST', url: '/api/admin/settings', body: { brandName: 'Hacked' } },
    { method: 'GET', url: '/api/admin/categories' },
    { method: 'POST', url: '/api/admin/categories', body: { type: 'category', data: { name: 'Hacked' } } },
    { method: 'DELETE', url: '/api/admin/categories?id=test-id' },
    { method: 'GET', url: '/api/admin/hero' },
    { method: 'POST', url: '/api/admin/hero', body: { desktopImage: 'test.jpg' } },
    { method: 'DELETE', url: '/api/admin/hero?id=test-id' },
    { method: 'GET', url: '/api/admin/reviews' },
    { method: 'PATCH', url: '/api/admin/reviews', body: { reviewId: '123', isApproved: true } },
    { method: 'DELETE', url: '/api/admin/reviews?id=test-id' },
    { method: 'GET', url: '/api/admin/customers' },
    { method: 'GET', url: '/api/admin/orders/receipt?orderId=any-order-id' },
    { method: 'POST', url: '/api/admin/orders/verify-payment', body: { orderId: '123', action: 'verify' } },
    { method: 'GET', url: '/api/orders' },
    { method: 'DELETE', url: '/api/orders' },
    { method: 'PATCH', url: '/api/orders' },
    { method: 'PUT', url: '/api/orders' },
  ];

  for (const ep of protectedEndpoints) {
    const opts = {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (ep.body) opts.body = JSON.stringify(ep.body);

    const res = await fetch(`${BASE_URL}${ep.url}`, opts);
    assert(
      res.status === 401,
      `${ep.method} ${ep.url} without auth returns 401 (got ${res.status})`
    );
  }

  // -------------------------------------------------------------
  // 2. INVALID AUTHENTICATION ATTEMPTS MUST BE 401
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Invalid Authentication Attempts ---');

  // Bad password login
  const badLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'WrongPassword123!' }),
  });
  assert(
    badLoginRes.status === 401,
    `POST /api/admin/auth/login with invalid password returns 401 (got ${badLoginRes.status})`
  );

  // Forged session token
  const forgedRes = await fetch(`${BASE_URL}/api/admin/orders`, {
    headers: {
      Cookie: 'arh_admin_session_v1=forged_token_payload_12345:abc:fake_sig',
    },
  });
  assert(
    forgedRes.status === 401,
    `GET /api/admin/orders with forged session token returns 401 (got ${forgedRes.status})`
  );

  // -------------------------------------------------------------
  // 3. VALID ADMIN LOGIN & AUTHENTICATED ACCESS
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Valid Admin Authentication & Authorized Access ---');

  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'Amin7866@' }),
  });

  assert(loginRes.status === 200, `Admin login successful (HTTP 200)`);
  const setCookieHeader = typeof loginRes.headers.getSetCookie === 'function'
    ? loginRes.headers.getSetCookie().join('; ')
    : loginRes.headers.get('set-cookie') || '';

  const cookieValMatch = setCookieHeader.match(/arh_admin_session_v1=([^;]+)/);
  const cookieVal = cookieValMatch ? `arh_admin_session_v1=${cookieValMatch[1]}` : '';

  assert(
    Boolean(cookieVal),
    `Server returned HttpOnly admin session cookie (${cookieVal})`
  );
  assert(
    setCookieHeader.toLowerCase().includes('httponly'),
    `Admin session cookie has HttpOnly flag`
  );

  // Auth check with cookie
  const checkRes = await fetch(`${BASE_URL}/api/admin/auth/check`, {
    headers: { Cookie: cookieVal },
  });
  const checkData = await checkRes.json();
  assert(checkData.authenticated === true, `GET /api/admin/auth/check confirms authenticated: true`);

  // Authorized access to admin endpoints
  const authEndpoints = [
    '/api/admin/orders',
    '/api/admin/products',
    '/api/admin/settings',
    '/api/admin/categories',
    '/api/admin/hero',
    '/api/admin/reviews',
    '/api/admin/customers',
  ];

  for (const url of authEndpoints) {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: { Cookie: cookieVal },
    });
    assert(res.status === 200, `GET ${url} with admin session returns 200 OK`);
  }

  // -------------------------------------------------------------
  // 4. PUBLIC ORDER LOOKUP (MINIMAL EXPOSURE)
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Guest Order Lookup Minimum Exposure ---');

  // Test guest lookup for nonexistent order
  const guestRes = await fetch(`${BASE_URL}/api/orders?orderNumber=ARH-999999&phone=03001234567`);
  assert(
    guestRes.status === 404,
    `GET /api/orders with non-existent orderNumber + phone returns 404 (got ${guestRes.status})`
  );

  // Test guest lookup without phone
  const guestNoPhone = await fetch(`${BASE_URL}/api/orders?orderNumber=ARH-999999`);
  assert(
    guestNoPhone.status === 401,
    `GET /api/orders without phone returns 401 Unauthorized (got ${guestNoPhone.status})`
  );

  // -------------------------------------------------------------
  // 5. RECEIPT SECURITY CHECK
  // -------------------------------------------------------------
  console.log('\n--- 5. Testing Payment Receipt Privacy ---');

  const unauthReceipt = await fetch(`${BASE_URL}/api/admin/orders/receipt?orderId=fake-id`);
  assert(
    unauthReceipt.status === 401,
    `Unauthenticated receipt request returns 401 Unauthorized`
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal audit suite error:', err);
  process.exit(1);
});
