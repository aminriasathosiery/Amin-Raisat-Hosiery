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

async function updateAllShippingRows() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const ids = ['f3423171-2124-496a-a123-3ac687ff4816', 'a0000000-0000-0000-0000-000000000001'];
  
  for (const id of ids) {
    const { data, error } = await supabase
      .from('shipping_settings')
      .update({ min_order_qty: 1, free_delivery_threshold: 3, base_delivery_charge: 200, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error updating row ${id}:`, error);
    } else {
      console.log(`Updated row ${id}:`, data);
    }
  }

  // Also call admin settings POST route to verify save through the application API
  const res = await fetch('http://localhost:3000/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shipping: {
        minOrderQty: 1,
        maxOrderQty: 100,
        baseDeliveryCharge: 200,
        freeDeliveryThreshold: 3,
      },
    }),
  });
  const resData = await res.json();
  console.log('API POST /api/admin/settings result:', resData);
}

updateAllShippingRows();
