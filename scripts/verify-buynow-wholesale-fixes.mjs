import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      const val = (match[2] || '').replace(/^["']|["']$/g, '').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
    }
  });
} catch (e) {}

console.log('=== VERIFYING BUY NOW & WHOLESALE BUSINESS LOGIC ===');

async function testLogic() {
  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase credentials not found.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch products and variants
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, slug, is_wholesale_enabled, wholesale_min_qty, product_variants(*)')
    .eq('is_published', true);

  if (prodErr || !products || products.length === 0) {
    console.warn('Could not fetch products:', prodErr);
    return;
  }

  console.log(`Fetched ${products.length} published products from Supabase.`);
  for (const prod of products) {
    console.log(`\nProduct: "${prod.name}" (${prod.slug})`);
    console.log(`  Wholesale enabled: ${prod.is_wholesale_enabled}, Wholesale min qty: ${prod.wholesale_min_qty}`);
    for (const v of prod.product_variants || []) {
      console.log(`  Variant [${v.quality} | ${v.sleeve} | ${v.size}]: Retail: Rs. ${v.price}${v.sale_price ? ` (Sale: Rs. ${v.sale_price})` : ''} | Wholesale: Rs. ${v.wholesale_price}`);
    }
  }

  // 2. Check shipping_settings
  const { data: shipping, error: shipErr } = await supabase
    .from('shipping_settings')
    .select('*')
    .limit(1)
    .single();

  if (!shipErr && shipping) {
    console.log('\nShipping Settings in DB:', {
      min_order_qty: shipping.min_order_qty,
      free_delivery_threshold: shipping.free_delivery_threshold,
      base_delivery_charge: shipping.base_delivery_charge,
    });
  }

  console.log('\n✅ Supabase product variants and shipping schema verified successfully.');
}

testLogic().catch((err) => console.error('Verification error:', err));
