const fs = require('fs');
const path = require('path');
const https = require('https');

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.SUPABASE_URL;

if (!serviceRoleKey || !supabaseUrl) {
  console.error('Missing required env vars: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL');
  process.exit(1);
}
const dbHostname = new URL(supabaseUrl).hostname;

const SEED_FILES = [
  '/Users/ismailcelik/Desktop/Apps/TheMessage/supabase/seeds/001_content.sql',
  '/Users/ismailcelik/Desktop/Apps/TheMessage/supabase/seeds/002_prayers.sql'
];

// Robust SQL string parser
function extractSqlStrings(sql) {
  const strings = [];
  let current = '';
  let inString = false;
  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    if (!inString) {
      if (char === "'") {
        inString = true;
        current = '';
      }
    } else {
      if (char === "'") {
        if (sql[i + 1] === "'") {
          current += "'";
          i++; // skip next quote
        } else {
          strings.push(current);
          inString = false;
        }
      } else {
        current += char;
      }
    }
    i++;
  }
  return strings;
}

// Normalize text for comparison, replacing Turkish chars and specific seed typos
function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/child/g, 'cocuk')        // seed typo
    .replace(/sabahledik/g, 'sabahladik') // seed typo
    .replace(/yonelledik/g, 'yoneldik')  // seed typo
    .replace(/['"’‘“”`.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// Parse seed files and collect all translations
const seedTranslations = [];
SEED_FILES.forEach((file) => {
  if (!fs.existsSync(file)) return;
  const sql = fs.readFileSync(file, 'utf8');
  const strings = extractSqlStrings(sql);
  
  strings.forEach((str) => {
    if (str.startsWith('{"tr":') || str.startsWith('{"tr" :')) {
      try {
        const parsed = JSON.parse(str);
        const tr = parsed.tr;
        const en = parsed.en;
        if (tr && en) {
          seedTranslations.push({
            trContent: tr.content,
            trSource: tr.source,
            enContent: en.content,
            enSource: en.source
          });
        }
      } catch (e) {
        // Ignore invalid JSON strings
      }
    }
  });
});

console.log(`Loaded ${seedTranslations.length} translation pairs from seed files.`);

// Punctuation fixing logic
function addMissingPeriod(text) {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.length === 0) return '';

  // Clean up double punctuation typos
  if (cleaned.endsWith('!.')) {
    cleaned = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('?.')) {
    cleaned = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('..')) {
    cleaned = cleaned.slice(0, -1);
  }

  // Handle single quote at the end
  if (cleaned.endsWith("'") || cleaned.endsWith('"')) {
    const quote = cleaned[cleaned.length - 1];
    const rest = cleaned.slice(0, -1).trim();
    if (rest.length > 0) {
      const beforeLastChar = rest[rest.length - 1];
      if (/[a-zA-Z0-9çğıöşüÇĞİÖŞÜâîûÂÎÛ,;\-–]$/.test(beforeLastChar)) {
        cleaned = rest + '.' + quote;
      }
    }
    return cleaned;
  }

  // Handle closing parenthesis at the end
  if (cleaned.endsWith(')')) {
    const rest = cleaned.slice(0, -1).trim();
    if (rest.length > 0) {
      const beforeLastChar = rest[rest.length - 1];
      if (/[a-zA-Z0-9çğıöşüÇĞİÖŞÜâîûÂÎÛ,;\-–]$/.test(beforeLastChar)) {
        cleaned = rest + '.)';
      }
    }
    return cleaned;
  }

  // Regular endings
  const lastChar = cleaned[cleaned.length - 1];
  const noPunctRegex = /[a-zA-Z0-9çğıöşüÇĞİÖŞÜâîûÂÎÛ,;\-–]$/;
  if (noPunctRegex.test(lastChar)) {
    cleaned += '.';
  }
  return cleaned;
}

// Fetch all content items from DB
function fetchContentItems() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: dbHostname,
      path: '/rest/v1/content_items?select=*',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Update a single content item in DB
function updateContentItem(id, translations) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ translations });
    const options = {
      hostname: dbHostname,
      path: `/rest/v1/content_items?id=eq.${id}`,
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Failed to update ${id}: Status ${res.statusCode}. Output: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const isDryRun = process.argv.includes('--write') ? false : true;
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (No database writes)' : 'WRITE (Updating database)'}\n`);

  try {
    const items = await fetchContentItems();
    const prayers = items.filter(item => item.type === 'prayer');
    console.log(`Fetched ${prayers.length} prayers from DB.`);

    const updates = [];
    const backupData = [];
    let duplicatesCount = 0;

    prayers.forEach((item) => {
      const origTranslations = JSON.parse(JSON.stringify(item.translations));
      let currentTranslations = JSON.parse(JSON.stringify(item.translations));

      const trContent = currentTranslations?.tr?.content;
      const enContent = currentTranslations?.en?.content;

      let isDuplicate = false;
      if (trContent && enContent && (trContent.trim() === enContent.trim() || normalize(trContent) === normalize(enContent))) {
        isDuplicate = true;
        duplicatesCount++;

        // Restore correct translation from seeds
        const normTr = normalize(trContent);
        const match = seedTranslations.find(s => normalize(s.trContent) === normTr);

        if (match) {
          currentTranslations.en.content = match.enContent;
          currentTranslations.en.source = match.enSource;
        } else {
          console.warn(`[WARNING] No seed match found for duplicate prayer ID ${item.id}: "${trContent.slice(0, 50)}..."`);
        }
      }

      // Apply punctuation corrections to both TR and EN content fields
      if (currentTranslations.tr?.content) {
        currentTranslations.tr.content = addMissingPeriod(currentTranslations.tr.content);
      }
      if (currentTranslations.en?.content) {
        currentTranslations.en.content = addMissingPeriod(currentTranslations.en.content);
      }

      // Compare translations object
      const hasChanged = JSON.stringify(origTranslations) !== JSON.stringify(currentTranslations);
      if (hasChanged) {
        updates.push({
          id: item.id,
          isDuplicate,
          original: origTranslations,
          updated: currentTranslations
        });
        backupData.push(item);
      }
    });

    console.log(`Detected duplicate prayers: ${duplicatesCount}`);
    console.log(`Total records requiring updates (due to duplicate translations or missing punctuation): ${updates.length}\n`);

    if (updates.length > 0) {
      // Save backup to file
      const backupPath = path.join(__dirname, 'prayers_backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`Saved backup of original data to ${backupPath}\n`);

      // Print preview of updates
      console.log('--- PREVIEW OF UPDATES ---');
      updates.forEach((up, index) => {
        console.log(`\n${index + 1}. ID: ${up.id} ${up.isDuplicate ? '[DUPLICATE FIXED]' : '[PUNCTUATION ONLY]'}`);
        console.log(`   TR ORIGINAL: "${up.original.tr.content}"`);
        console.log(`   TR UPDATED : "${up.updated.tr.content}"`);
        console.log(`   EN ORIGINAL: "${up.original.en.content.slice(0, 80)}..."`);
        console.log(`   EN UPDATED : "${up.updated.en.content.slice(0, 80)}..."`);
      });

      if (!isDryRun) {
        console.log('\nStarting database updates...');
        for (let i = 0; i < updates.length; i++) {
          const up = updates[i];
          process.stdout.write(`Updating ${i + 1}/${updates.length} (ID: ${up.id})... `);
          await updateContentItem(up.id, up.updated);
          console.log('OK');
        }
        console.log('\nAll updates completed successfully!');
      } else {
        console.log('\nDry-run mode. Run with "--write" flag to apply these changes to the live database.');
      }
    } else {
      console.log('No updates required. Database content matches completely.');
    }

  } catch (e) {
    console.error('An error occurred during execution:', e);
  }
}

run();
