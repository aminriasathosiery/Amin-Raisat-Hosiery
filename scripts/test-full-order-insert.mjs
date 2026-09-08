import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

async function testFullOrderInsert() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const orderRes = await supabase.from('orders').insert({
    order_number: `ARH-DEBUG-${Date.now().toString().slice(-4)}`,
    customer_name: 'Debug Customer',
    customer_phone: '03001234567',
    address: 'Debug Address',
    city: 'Faisalabad',
    province: 'Punjab',
    subtotal: 385,
    delivery_fee: 200,
    total_amount: 585,
    payment_method: 'cod',
    status: 'Pending',
  }).select().single();

  console.log('Order insert:', orderRes);
  if (!orderRes.data) return;

  const itemRes = await supabase.from('order_items').insert({
    order_id: orderRes.data.id,
    product_name: 'Test Vest',
    quality: 'High Quality',
    sleeve: 'Sleeveless',
    size: 'S',
    unit_price: 385,
    quantity: 1,
    total_price: 385,
  }).select();

  console.log('Item insert:', itemRes);
}

testFullOrderInsert();
