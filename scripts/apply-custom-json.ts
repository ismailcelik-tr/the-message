import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment.');
    process.exit(1);
  }

  const jsonPath = path.join(process.cwd(), 'classified_moods.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: Could not find 'classified_moods.json' at ${jsonPath}`);
    console.log('Please make sure to download the file from ChatGPT and save it in the project root folder.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!Array.isArray(data)) {
    console.error('Error: classified_moods.json must be a JSON array.');
    process.exit(1);
  }

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Starting to apply classifications for ${data.length} items...`);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item.id) {
      console.warn(`[Row ${i + 1}] Missing ID field, skipping.`);
      continue;
    }

    const moods = Array.isArray(item.moods) ? item.moods : [];

    const { error } = await supabase
      .from('content_items')
      .update({ moods })
      .eq('id', item.id);

    if (error) {
      console.error(`Failed to update item ${item.id}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log('\n--- CUSTOM JSON APPLY COMPLETE ---');
  console.log(`Successfully updated: ${successCount} items.`);
  console.log(`Errors encountered: ${errorCount}`);
}

main().catch(console.error);
