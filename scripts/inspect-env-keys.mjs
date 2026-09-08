import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    const val = (match[2] || '').replace(/^["']|["']$/g, '').trim();
    if (key.includes('KEY')) {
      console.log(key, 'prefix:', val.slice(0, 15), 'length:', val.length);
      if (val.startsWith('eyJ')) {
        try {
          const parts = val.split('.');
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          console.log('  JWT Payload role:', payload.role, 'iss:', payload.iss);
        } catch (e) {}
      }
    }
  }
});
