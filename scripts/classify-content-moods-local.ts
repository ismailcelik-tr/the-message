import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Valid mood keys
const ALLOWED_MOODS = [
  'huzunlu',
  'stresli',
  'yorgun',
  'sukurlu',
  'hasta',
  'kaygili',
  'yalniz',
  'kararsiz',
  'umutlu'
];

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isApply = args.includes('--apply');

  let limitCount = Infinity;
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limitCount = parseInt(args[limitIdx + 1], 10);
  }

  if (!isDryRun && !isApply) {
    console.error('Error: Please specify either --dry-run or --apply');
    console.log('Usage:');
    console.log('  npx tsx scripts/classify-content-moods-local.ts --dry-run');
    console.log('  npx tsx scripts/classify-content-moods-local.ts --apply');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment.');
    process.exit(1);
  }

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch active contents (excluding esma)
  console.log('Fetching active content items...');
  let { data: items, error } = await supabase
    .from('content_items')
    .select('*')
    .neq('type', 'esma')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching content items:', error.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('No active content items found.');
    process.exit(0);
  }

  if (limitCount < items.length) {
    console.log(`Limiting classification to the first ${limitCount} items (out of ${items.length} total).`);
    items = items.slice(0, limitCount);
  } else {
    console.log(`Found ${items.length} items to classify.`);
  }

  const results: Array<{ id: string; type: string; snippet: string; moods: string[] }> = [];
  let updatedCount = 0;
  let errorCount = 0;
  
  // Local LLMs are run locally, we can send slightly smaller batch sizes (e.g. 10 items) to guarantee JSON output accuracy
  const batchSize = 10;

  console.log('Starting local classification via LM Studio...');

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    console.log(`[Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}] Classifying ${chunk.length} items...`);

    const promptItems = chunk.map((item, idx) => {
      const trText = item.translations?.tr?.content || '';
      const enText = item.translations?.en?.content || '';
      return `${idx + 1}. ID: "${item.id}"\n   Type: "${item.type}"\n   TR: "${trText}"\n   EN: "${enText}"`;
    }).join('\n\n');

    const prompt = `
You are classifying Islamic content for a spiritual mobile app.
We want to categorize content under appropriate moods so users can find comfort, motivation, or guidance.

Given the list of content items below, choose the most relevant mood labels for each item from this allowed list only:
${JSON.stringify(ALLOWED_MOODS)}

Rules:
- Return ONLY a valid JSON array of objects matching this schema:
[
  {
    "id": "item_id_here",
    "moods": ["label1", "label2"]
  }
]
- Do not invent new labels. Only use labels from the list.
- Use zero, one, or multiple labels depending on what fits.
- If no labels fit, return an empty array for that item.
- Consider the emotional, psychological, and spiritual meaning of the text.

Items:
${promptItems}
`;

    let success = false;
    let batchResults: Array<{ id: string; moods: string[] }> = [];

    try {
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resData = await response.json() as any;
      const text = resData.choices[0].message.content;
      
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(text.trim());
      } catch (pe) {
        // Fallback for potential markdown wrappers
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedJson = JSON.parse(cleaned);
      }

      if (Array.isArray(parsedJson)) {
        batchResults = parsedJson;
      } else if (parsedJson && Array.isArray(parsedJson.items)) {
        batchResults = parsedJson.items;
      } else if (parsedJson && typeof parsedJson === 'object') {
        // If local LLM wrapped the array in a key, try to extract it
        const firstKey = Object.keys(parsedJson)[0];
        if (Array.isArray(parsedJson[firstKey])) {
          batchResults = parsedJson[firstKey];
        } else {
          throw new Error('Invalid JSON format, expected array');
        }
      } else {
        throw new Error('Invalid JSON format, expected array');
      }
      success = true;
    } catch (e: any) {
      console.error(`Error classifying batch starting at index ${i}:`, e.message || e);
      errorCount += chunk.length;
    }

    if (success) {
      const batchResultMap = new Map(batchResults.map(r => [r.id, r.moods]));
      
      for (const item of chunk) {
        const trText = item.translations?.tr?.content || '';
        const snippet = trText.length > 60 ? trText.substring(0, 60) + '...' : trText;
        const generatedMoods = batchResultMap.get(item.id) || [];
        const validatedMoods = Array.from(
          new Set(
            generatedMoods
              .map((m: string) => m.toLowerCase().trim())
              .filter((m: string) => ALLOWED_MOODS.includes(m))
          )
        );

        results.push({
          id: item.id,
          type: item.type || 'unknown',
          snippet,
          moods: validatedMoods
        });

        if (isApply) {
          const { error: updateError } = await supabase
            .from('content_items')
            .update({ moods: validatedMoods })
            .eq('id', item.id);

          if (updateError) {
            console.error(`Failed to update item ${item.id}:`, updateError.message);
            errorCount++;
          } else {
            updatedCount++;
          }
        } else {
          updatedCount++;
        }
      }
    } else {
      // Mark all in this batch as empty/failed
      for (const item of chunk) {
        const trText = item.translations?.tr?.content || '';
        const snippet = trText.length > 60 ? trText.substring(0, 60) + '...' : trText;
        results.push({
          id: item.id,
          type: item.type || 'unknown',
          snippet,
          moods: []
        });
      }
    }

    // Small delay (100ms) between local requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (isDryRun) {
    const previewPath = path.join(process.cwd(), 'mood-classification-preview.json');
    fs.writeFileSync(previewPath, JSON.stringify(results, null, 2), 'utf8');
    console.log('\n--- DRY RUN RESULTS ---');
    console.log(`Successfully classified: ${results.length} items.`);
    console.log(`Saved classification preview to: ${previewPath}`);
    console.log('No changes were made to the database.');
  } else {
    console.log('\n--- APPLY COMPLETE ---');
    console.log(`Successfully updated: ${updatedCount} items.`);
    console.log(`Errors encountered: ${errorCount}`);
  }
}

main().catch((err) => {
  console.error('Fatal error running classification script:', err);
  process.exit(1);
});
