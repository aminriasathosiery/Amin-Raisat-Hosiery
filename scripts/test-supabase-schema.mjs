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

async function check() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: products, error } = await supabase
    .from('products')
    .select('*, product_variants(*), product_media(*)')
    .eq('is_published', true);

  if (error) {
    console.error('Select * error:', error);
  } else {
    console.log('Select * succeeded. Fetched', products.length, 'products.');
    if (products.length > 0) {
      console.log('Product keys:', Object.keys(products[0]));
      if (products[0].product_variants?.length > 0) {
        console.log('Variant keys:', Object.keys(products[0].product_variants[0]));
        console.log('Variant sample:', products[0].product_variants[0]);
      }
    }
  }
}

check();
