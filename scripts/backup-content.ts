import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Veritabanına bağlanılıyor ve yedek alınıyor...');

  const { data, error } = await supabase
    .from('content_items')
    .select('*');

  if (error) {
    console.error('Yedek alınırken hata oluştu:', error.message);
    process.exit(1);
  }

  const backupPath = path.join(process.cwd(), 'content_items_backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`\nBaşarılı! Toplam ${data.length} kayıt yedeklendi.`);
  console.log(`Yedek dosyası konumu: ${backupPath}`);
}

main().catch(console.error);
