const { GoogleGenerativeAI } = require("@google/generative-ai");
const https = require("https");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY');
  process.exit(1);
}
const dbHostname = new URL(supabaseUrl).hostname;

const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' }
});

// We will store generated content snippets to prevent duplicates
const generatedSnippets = [];

function postToSupabase(items) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(items);
    const options = {
      hostname: dbHostname,
      path: '/rest/v1/content_items',
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Supabase error: Status ${res.statusCode}. Body: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function generateBatch(batchNum) {
  console.log(`Generating batch ${batchNum}/10...`);
  
  const exclusions = generatedSnippets.slice(-100).map(s => `"${s}"`).join(', ');

  const prompt = `
You are generating authentic, high-quality, inspiring, and comforting Islamic content for a spiritual mobile app.
Generate exactly 30 content items. The batch must contain exactly:
- 6 verses (type: "verse")
- 6 hadiths (type: "hadith")
- 6 prayers (type: "prayer")
- 6 dhikrs (type: "dhikr")
- 6 worship advices (type: "worship")

For each item, select:
- type: "verse" | "hadith" | "prayer" | "dhikr" | "worship"
- category: choose one of ["hope", "purpose", "worship", "prayer", "dhikr"]. Select the most appropriate.
- recommended_time: choose one of ["morning", "noon", "evening", "any"].
- moods: choose 1 to 3 relevant moods from ["huzunlu", "stresli", "yorgun", "sukurlu", "hasta", "kaygili", "yalniz", "kararsiz", "umutlu"].
- translations: A JSON object with "tr" and "en" keys:
  - tr: { "content": "Turkish translation/text", "source": "Turkish source" }
  - en: { "content": "English translation/text", "source": "English source" }
  For "dhikr" and "prayer" and "worship" items, you may optionally include "arabicText" (Arabic script) and "transliteration" (phonetic pronunciation in Latin script) in both tr and en translation objects where appropriate.

Requirements:
1. Content MUST be authentic, accurate, and completely translated (no mixing of Turkish/English).
2. The English translation of content and source must be fully in English. The Turkish translation of content and source must be fully in Turkish.
3. Use primary verified sources:
   - For verses: Quran (Diyanet TR, Sahih International EN). Source formats: TR e.g. "Bakara, 2/255", EN e.g. "Surah Al-Baqarah, 2:255".
   - For hadiths: Bukhari, Muslim, Tirmidhi, Abu Dawud, Riyadh as-Salihin.
   - For prayers: Hisnul Muslim, Quran, Hadith.
   - For dhikrs: Bukhari, Muslim, Hisnul Muslim.
   - For worship: Riyadh as-Salihin, Bukhari, Muslim.
4. IMPORTANT: Do NOT generate duplicate items. Each item must be unique.
${exclusions.length > 0 ? `Do NOT generate content similar to the following already generated items:\n${exclusions}` : ''}
5. All texts must end with proper punctuation (e.g. periods, exclamation marks). Do not leave them unpunctuated.

Return ONLY a valid JSON array of these 30 items matching the schema below. Do not include markdown code block formatting or backticks, just raw JSON text.
JSON Schema:
[
  {
    "type": "...",
    "category": "...",
    "recommended_time": "...",
    "moods": [...],
    "translations": {
      "tr": { "content": "...", "source": "..." },
      "en": { "content": "...", "source": "..." }
    }
  }
]
`;

  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      
      let parsedJson;
      try {
        parsedJson = JSON.parse(text.trim());
      } catch (pe) {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedJson = JSON.parse(cleaned);
      }

      if (!Array.isArray(parsedJson) || parsedJson.length === 0) {
        throw new Error("Invalid response format, expected non-empty array");
      }

      // Validate counts
      const counts = { verse: 0, hadith: 0, prayer: 0, dhikr: 0, worship: 0 };
      parsedJson.forEach(item => {
        if (counts[item.type] !== undefined) {
          counts[item.type]++;
        }
      });

      console.log(`Received ${parsedJson.length} items. Counts:`, counts);

      return parsedJson;
    } catch (err) {
      attempts++;
      console.warn(`Attempt ${attempts} failed: ${err.message}. Retrying...`);
      if (attempts >= maxAttempts) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function run() {
  console.log("Starting generation of 300 staging content items...");
  let totalInserted = 0;

  for (let b = 1; b <= 10; b++) {
    try {
      const rawItems = await generateBatch(b);
      
      // Map to DB schema fields and add is_active: false
      const dbItems = rawItems.map(item => {
        // Track snippet to avoid duplicate
        const trContent = item.translations?.tr?.content || '';
        if (trContent) {
          generatedSnippets.push(trContent.slice(0, 40));
        }

        return {
          type: item.type,
          category: item.category,
          recommended_time: item.recommended_time || 'any',
          translations: item.translations,
          moods: item.moods || [],
          is_active: false
        };
      });

      // Insert to Supabase
      const inserted = await postToSupabase(dbItems);
      totalInserted += inserted.length;
      console.log(`Successfully inserted batch ${b} (${inserted.length} items). Total so far: ${totalInserted}`);
      
      // Delay to avoid rate limits
      await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
      console.error(`Error processing batch ${b}:`, e.message);
      // Wait longer on error and try next batch
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  console.log(`\nFinished! Total staging items inserted: ${totalInserted}`);
}

run();
