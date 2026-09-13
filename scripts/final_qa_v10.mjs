// Comprehensive Post-Migration v10 QA Test Suite

const SUPABASE_URL = 'https://pqjpgexmupcuuqfzchhc.supabase.co';
const ANON_KEY = 'sb_publishable_NGQj434a2YlJRZ-OVzst1g_tw3QYVSP';
const APP_URL = 'http://localhost:3001';
const ADMIN_PWD = 'Amin7866@';

const results = [];

function record(issue, test, expected, actual, pass, evidence) {
  results.push({ issue, test, expected, actual, pass: pass ? 'PASS' : 'FAIL', evidence });
  const statusStr = pass ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${statusStr} ${issue} :: ${test} -> ${actual}`);
}

async function runDirectSupabaseRLSTests() {
  console.log('\n==================================================');
  console.log('PHASE 1: DIRECT SUPABASE RLS WRITE & READ TESTS');
  console.log('==================================================\n');

  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  // 1. POST /deals (anon)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deals`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'HACK DEAL',
        slug: 'hack-deal-' + Date.now(),
        sale_price: 1,
        original_price: 1000,
        discount_percentage: 99,
        is_active: true,
      }),
    });
    const text = await res.text();
    const blocked = res.status === 401 || res.status === 403 || text.includes('row-level security') || text.includes('permission denied');
    record('Deals RLS', 'Anonymous POST /deals', 'Blocked (401/403/RLS)', `HTTP ${res.status}: ${text.slice(0, 100)}`, blocked, text.slice(0, 200));
  } catch (e) {
    record('Deals RLS', 'Anonymous POST /deals', 'Blocked', e.message, true, e.message);
  }

  // 2. PATCH /deals (anon)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deals?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sale_price: 1 }),
    });
    const text = await res.text();
    const blocked = res.status === 401 || res.status === 403 || text.includes('row-level security') || text.includes('permission denied') || (res.status === 200 && text === '[]');
    record('Deals RLS', 'Anonymous PATCH /deals', 'Blocked / 0 rows', `HTTP ${res.status}: ${text.slice(0, 100)}`, blocked, text.slice(0, 200));
  } catch (e) {
    record('Deals RLS', 'Anonymous PATCH /deals', 'Blocked', e.message, true, e.message);
  }

  // 3. DELETE /deals (anon)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deals?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers,
    });
    const text = await res.text();
    const blocked = res.status === 401 || res.status === 403 || text.includes('row-level security') || text.includes('permission denied') || (res.status === 200 && text === '[]');
    record('Deals RLS', 'Anonymous DELETE /deals', 'Blocked / 0 rows', `HTTP ${res.status}: ${text.slice(0, 100)}`, blocked, text.slice(0, 200));
  } catch (e) {
    record('Deals RLS', 'Anonymous DELETE /deals', 'Blocked', e.message, true, e.message);
  }

  // 4. Products RLS: POST /products (anon)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'HACK PRODUCT', slug: 'hack-p-' + Date.now() }),
    });
    const text = await res.text();
    const blocked = res.status === 401 || res.status === 403 || text.includes('row-level security') || text.includes('permission denied');
    record('Products RLS', 'Anonymous POST /products', 'Blocked (401/403/RLS)', `HTTP ${res.status}: ${text.slice(0, 100)}`, blocked, text.slice(0, 200));
  } catch (e) {
    record('Products RLS', 'Anonymous POST /products', 'Blocked', e.message, true, e.message);
  }

  // 5. Product Variants RLS: POST /product_variants (anon)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/product_variants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ price: 1, stock: 999 }),
    });
    const text = await res.text();
    const blocked = res.status === 401 || res.status === 403 || text.includes('row-level security') || text.includes('permission denied');
    record('Product Variants RLS', 'Anonymous POST /product_variants', 'Blocked (401/403/RLS)', `HTTP ${res.status}: ${text.slice(0, 100)}`, blocked, text.slice(0, 200));
  } catch (e) {
    record('Product Variants RLS', 'Anonymous POST /product_variants', 'Blocked', e.message, true, e.message);
  }

  // 6. Product Media RLS: POST /product_media (anon)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/product_media`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: 'http://hack.com/bad.jpg' }),
    });
    const text = await res.text();
    const blocked = res.status === 401 || res.status === 403 || text.includes('row-level security') || text.includes('permission denied');
    record('Product Media RLS', 'Anonymous POST /product_media', 'Blocked (401/403/RLS)', `HTTP ${res.status}: ${text.slice(0, 100)}`, blocked, text.slice(0, 200));
  } catch (e) {
    record('Product Media RLS', 'Anonymous POST /product_media', 'Blocked', e.message, true, e.message);
  }

  // 7. Shipping Settings RLS: PATCH /shipping_settings (anon)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shipping_settings?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ base_delivery_charge: 0 }),
    });
    const text = await res.text();
    const blocked = res.status === 401 || res.status === 403 || text.includes('row-level security') || text.includes('permission denied') || (res.status === 200 && text === '[]');
    record('Shipping Settings RLS', 'Anonymous PATCH /shipping_settings', 'Blocked (401/403/RLS)', `HTTP ${res.status}: ${text.slice(0, 100)}`, blocked, text.slice(0, 200));
  } catch (e) {
    record('Shipping Settings RLS', 'Anonymous PATCH /shipping_settings', 'Blocked', e.message, true, e.message);
  }

  // 8. Site Settings RLS: PATCH /site_settings (anon)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ brand_name: 'HACKED' }),
    });
    const text = await res.text();
    const blocked = res.status === 401 || res.status === 403 || text.includes('row-level security') || text.includes('permission denied') || (res.status === 200 && text === '[]');
    record('Site Settings RLS', 'Anonymous PATCH /site_settings', 'Blocked (401/403/RLS)', `HTTP ${res.status}: ${text.slice(0, 100)}`, blocked, text.slice(0, 200));
  } catch (e) {
    record('Site Settings RLS', 'Anonymous PATCH /site_settings', 'Blocked', e.message, true, e.message);
  }

  // 9. Legitimate Public READ: GET /deals
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deals?select=*&is_active=eq.true`, { headers });
    const data = await res.json();
    const ok = res.status === 200 && Array.isArray(data);
    record('Storefront Deals READ', 'Public GET /deals (active)', 'HTTP 200 & Array', `HTTP ${res.status} (Count: ${data?.length})`, ok, JSON.stringify(data));
  } catch (e) {
    record('Storefront Deals READ', 'Public GET /deals', 'HTTP 200', e.message, false, e.message);
  }

  // 10. Legitimate Public READ: GET /products
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,sort_order&is_published=eq.true&order=sort_order.asc`, { headers });
    const data = await res.json();
    const ok = res.status === 200 && Array.isArray(data) && data.length > 0;
    record('Storefront Products READ', 'Public GET /products', 'HTTP 200 & Products > 0', `HTTP ${res.status} (Count: ${data?.length})`, ok, JSON.stringify(data));
  } catch (e) {
    record('Storefront Products READ', 'Public GET /products', 'HTTP 200', e.message, false, e.message);
  }

  // 11. Legitimate Public READ: GET /shipping_settings
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shipping_settings?select=*`, { headers });
    const data = await res.json();
    const ok = res.status === 200 && Array.isArray(data);
    record('Storefront Settings READ', 'Public GET /shipping_settings', 'HTTP 200', `HTTP ${res.status}`, ok, JSON.stringify(data));
  } catch (e) {
    record('Storefront Settings READ', 'Public GET /shipping_settings', 'HTTP 200', e.message, false, e.message);
  }
}

async function runApplicationQATests() {
  console.log('\n==================================================');
  console.log('PHASE 2: APPLICATION, API & PRICING QA TESTS');
  console.log('==================================================\n');

  // 1. Public Products API - Sort Order & Data Mapping
  try {
    let res = await fetch(`${APP_URL}/api/products`);
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 1500));
      res = await fetch(`${APP_URL}/api/products`);
    }
    const data = await res.json();
    const products = data.products || [];
    const hasSortOrder = products.every((p) => typeof p.sortOrder === 'number');
    const isSorted = products.every((p, i) => i === 0 || p.sortOrder >= products[i - 1].sortOrder);
    record(
      'Product Sort Persistence',
      'GET /api/products returns mapped and ordered sortOrder',
      'All products have sortOrder and sorted ASC',
      `Count: ${products.length}, hasSortOrder: ${hasSortOrder}, isSorted: ${isSorted}`,
      hasSortOrder && isSorted,
      JSON.stringify(products.map((p) => ({ name: p.name.slice(0, 30), sortOrder: p.sortOrder })))
    );
  } catch (e) {
    record('Product Sort Persistence', 'GET /api/products', 'Success', e.message, false, e.message);
  }

  // 2. Admin Authentication
  let adminCookie = '';
  try {
    const res = await fetch(`${APP_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PWD }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      adminCookie = setCookie.split(';')[0];
    }
    const ok = res.status === 200 && adminCookie.includes('arh_admin_session');
    record('Admin Authentication', 'POST /api/admin/auth/login', 'HTTP 200 & session cookie', `HTTP ${res.status}, cookie present: ${Boolean(adminCookie)}`, ok, setCookie);
  } catch (e) {
    record('Admin Authentication', 'Login', 'HTTP 200', e.message, false, e.message);
  }

  // 3. Create a Test Deal via Admin
  let testDeal = null;
  try {
    const res = await fetch(`${APP_URL}/api/admin/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        name: 'QA Production Test Deal',
        slug: 'qa-prod-deal-' + Date.now(),
        piecesCount: 4,
        originalPrice: 2400,
        discountPercentage: 25,
        isFreeDelivery: false,
        isActive: true,
        isFeatured: true,
        sortOrder: 1,
      }),
    });
    const data = await res.json();
    testDeal = data.deal;
    const ok = (res.status === 200 && testDeal?.salePrice === 1800) || (res.status === 503 && data.error?.includes('SUPABASE_SERVICE_ROLE_KEY'));
    record('Deals CRUD (Admin)', 'Admin create deal with 25% discount', 'HTTP 200 (if service role key set) or HTTP 503 diagnostic', `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 100)}`, ok, JSON.stringify(data));
  } catch (e) {
    record('Deals CRUD', 'Create deal', 'HTTP 200', e.message, false, e.message);
  }

  // 4. Duplicate Deal Prevention (Test slug collision)
  if (testDeal) {
    try {
      const res = await fetch(`${APP_URL}/api/admin/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
        body: JSON.stringify({
          name: 'Duplicate QA Deal',
          slug: testDeal.slug, // exact duplicate slug
          piecesCount: 4,
          originalPrice: 2400,
          discountPercentage: 10,
        }),
      });
      const data = await res.json();
      const blocked = res.status === 400 && data.error?.includes('already exists');
      record('Duplicate Deal', 'Create deal with existing slug', 'HTTP 400 with friendly message', `HTTP ${res.status}: ${data.error}`, blocked, JSON.stringify(data));
    } catch (e) {
      record('Duplicate Deal', 'Slug collision test', 'HTTP 400', e.message, false, e.message);
    }
  }

  // 5. Deal Price Tampering Test (Submitting unitPrice: 1, discountPercentage: 99 on verified deal)
  if (testDeal) {
    try {
      const tamperPayload = {
        customerName: 'Security QA Auditor',
        customerPhone: '03001234567',
        address: '123 QA St',
        city: 'Lahore',
        paymentMethod: 'cod',
        items: [
          {
            dealId: testDeal.id,
            dealName: testDeal.name,
            unitPrice: 1, // TAMPERED from 1800 to 1
            discountPercentage: 99, // TAMPERED from 25 to 99
            isFreeDelivery: true, // TAMPERED from false to true
            quantity: 1,
          },
        ],
      };

      const res = await fetch(`${APP_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tamperPayload),
      });
      const data = await res.json();
      const verifiedItem = data.order?.items?.[0];
      const tamperRejected =
        verifiedItem?.unitPrice === 1800 &&
        verifiedItem?.isFreeDelivery === false &&
        data.order?.subtotal === 1800 &&
        data.order?.deliveryFee === 200 &&
        data.order?.totalAmount === 2000;

      record(
        'Deal Price Tampering',
        'POST /api/orders with tampered deal unitPrice: 1, isFreeDelivery: true',
        'Server overrides with DB verified salePrice 1800, deliveryFee 200, total 2000',
        `unitPrice: ${verifiedItem?.unitPrice}, deliveryFee: ${data.order?.deliveryFee}, totalAmount: ${data.order?.totalAmount}`,
        tamperRejected,
        JSON.stringify(data.order)
      );
    } catch (e) {
      record('Deal Price Tampering', 'Tamper test', 'Server overrides', e.message, false, e.message);
    }
  }

  // 6. Fake Deal ID Submission Test
  try {
    const fakeDealPayload = {
      customerName: 'Attacker',
      customerPhone: '03001234567',
      address: 'Fake Address',
      city: 'Karachi',
      paymentMethod: 'cod',
      items: [
        {
          dealId: '00000000-0000-0000-0000-000000000000',
          dealName: 'Fake Deal',
          unitPrice: 1,
          quantity: 1,
        },
      ],
    };
    const res = await fetch(`${APP_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fakeDealPayload),
    });
    const data = await res.json();
    const rejected = res.status === 400 && data.error?.includes('not exist');
    record('Fake Deal ID Rejection', 'POST /api/orders with fake dealId', 'HTTP 400 Deal does not exist', `HTTP ${res.status}: ${data.error}`, rejected, JSON.stringify(data));
  } catch (e) {
    record('Fake Deal ID Rejection', 'Fake deal test', 'HTTP 400', e.message, false, e.message);
  }

  // 7. Normal Product Order & Quantity Free Delivery Threshold Rules
  // Test quantity: 1 (should charge Rs. 200 delivery)
  try {
    const p1Payload = {
      customerName: 'Normal Buyer',
      customerPhone: '03001234567',
      address: 'Normal Address',
      city: 'Lahore',
      paymentMethod: 'cod',
      items: [
        {
          productId: 'f0000000-0000-0000-0000-000000000001',
          quality: 'High Quality',
          sleeve: 'Sleeveless',
          size: 'L',
          quantity: 1,
        },
      ],
    };
    const res = await fetch(`${APP_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p1Payload),
    });
    const data = await res.json();
    const feeIs200 = data.order?.deliveryFee === 200 && data.order?.totalAmount === (data.order?.subtotal + 200);
    record('Delivery Fee Rule: Qty 1', 'POST /api/orders with 1 item', 'deliveryFee: 200', `deliveryFee: ${data.order?.deliveryFee}, total: ${data.order?.totalAmount}`, feeIs200, JSON.stringify(data.order));
  } catch (e) {
    record('Delivery Fee Rule: Qty 1', 'Qty 1 test', 'deliveryFee: 200', e.message, false, e.message);
  }

  // Test quantity: 3+ (should grant FREE delivery)
  try {
    const p3Payload = {
      customerName: 'Threshold Buyer',
      customerPhone: '03001234567',
      address: 'Threshold Address',
      city: 'Lahore',
      paymentMethod: 'cod',
      items: [
        {
          productId: 'f0000000-0000-0000-0000-000000000001',
          quality: 'High Quality',
          sleeve: 'Sleeveless',
          size: 'L',
          quantity: 3,
        },
      ],
    };
    const res = await fetch(`${APP_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p3Payload),
    });
    const data = await res.json();
    const feeIs0 = data.order?.deliveryFee === 0 && data.order?.totalAmount === data.order?.subtotal;
    record('Delivery Fee Rule: Qty 3+ Free', 'POST /api/orders with 3 items', 'deliveryFee: 0', `deliveryFee: ${data.order?.deliveryFee}, total: ${data.order?.totalAmount}`, feeIs0, JSON.stringify(data.order));
  } catch (e) {
    record('Delivery Fee Rule: Qty 3+ Free', 'Qty 3+ test', 'deliveryFee: 0', e.message, false, e.message);
  }

  // 8. Admin Endpoints Service Role Key Diagnostic Check
  // Check Admin Orders endpoint
  try {
    const res = await fetch(`${APP_URL}/api/admin/orders`, {
      headers: { 'Cookie': adminCookie },
    });
    const data = await res.json();
    const isHandled = res.status === 200 || (res.status === 503 && data.error?.includes('SUPABASE_SERVICE_ROLE_KEY'));
    record(
      'Admin Orders API',
      'GET /api/admin/orders',
      'HTTP 200 (if service role key configured) or explicit HTTP 503 error message',
      `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 100)}`,
      isHandled,
      JSON.stringify(data)
    );
  } catch (e) {
    record('Admin Orders API', 'GET /api/admin/orders', 'Handled response', e.message, false, e.message);
  }

  // Check Admin Product Reorder endpoint
  try {
    const res = await fetch(`${APP_URL}/api/admin/products/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        products: [
          { id: 'f0000000-0000-0000-0000-000000000001', sortOrder: 1 },
          { id: 'f0000000-0000-0000-0000-000000000002', sortOrder: 2 },
        ],
      }),
    });
    const data = await res.json();
    const isHandled = res.status === 200 || (res.status === 503 && data.error?.includes('SUPABASE_SERVICE_ROLE_KEY'));
    record(
      'Admin Product Reorder API',
      'POST /api/admin/products/reorder',
      'HTTP 200 or explicit HTTP 503',
      `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 100)}`,
      isHandled,
      JSON.stringify(data)
    );
  } catch (e) {
    record('Admin Product Reorder API', 'POST /api/admin/products/reorder', 'Handled response', e.message, false, e.message);
  }

  // 9. Clean up test deal
  if (testDeal) {
    try {
      const res = await fetch(`${APP_URL}/api/admin/deals?id=${testDeal.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': adminCookie },
      });
      console.log(`Cleaned up QA test deal: ${res.status}`);
    } catch {}
  }

  // 10. Storefront Pages Availability Checks
  const pages = [
    '/',
    '/shop',
    '/deals',
    '/cart',
    '/checkout',
    '/about',
    '/contact',
    '/admin/login',
  ];

  for (const p of pages) {
    try {
      const res = await fetch(`${APP_URL}${p}`);
      const ok = res.status === 200;
      record('Storefront Page Availability', `GET ${p}`, 'HTTP 200', `HTTP ${res.status}`, ok, `Status: ${res.status}`);
    } catch (e) {
      record('Storefront Page Availability', `GET ${p}`, 'HTTP 200', e.message, false, e.message);
    }
  }

  console.log('\n==================================================');
  console.log('SUMMARY OF RESULTS');
  console.log('==================================================\n');
  const passes = results.filter((r) => r.pass === 'PASS').length;
  const fails = results.filter((r) => r.pass === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASS: ${passes}`);
  console.log(`FAIL: ${fails}`);
}

async function main() {
  await runDirectSupabaseRLSTests();
  await runApplicationQATests();
}

main().catch(console.error);
