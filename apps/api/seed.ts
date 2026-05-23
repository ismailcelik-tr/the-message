import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'cagri_db',
});

const contents = [
  // ESMA-ÜL HÜSNA
  {
    type: 'esma',
    category: 'dhikr',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Sonsuz merhametiyle lütuf ve ihsanda bulunan.',
        arabicText: 'الرَّحْمَنُ',
        transliteration: 'er-Rahmân',
        source: 'Esma-ül Hüsna',
      },
      en: {
        content: 'The Most Gracious — He who bestows boundless mercy and grace.',
        arabicText: 'الرَّحْمَنُ',
        transliteration: 'ar-Rahmān',
        source: "Asma' ul-Husna",
      },
    },
  },
  {
    type: 'esma',
    category: 'dhikr',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Müminlere karşı merhametli olan.',
        arabicText: 'الرَّحِيمُ',
        transliteration: 'er-Rahîm',
        source: 'Esma-ül Hüsna',
      },
      en: {
        content: 'The Most Merciful — especially to the believers.',
        arabicText: 'الرَّحِيمُ',
        transliteration: 'ar-Rahīm',
        source: "Asma' ul-Husna",
      },
    },
  },
  {
    type: 'esma',
    category: 'dhikr',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Eşi ve benzeri olmayan tek ilah.',
        arabicText: 'اللَّهُ',
        transliteration: 'Allah',
        source: 'Esma-ül Hüsna',
      },
      en: {
        content: 'The One God — the sole deity worthy of worship.',
        arabicText: 'اللَّهُ',
        transliteration: 'Allāh',
        source: "Asma' ul-Husna",
      },
    },
  },
  {
    type: 'esma',
    category: 'dhikr',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Her şeyin hakiki sahibi ve hükümdarı.',
        arabicText: 'الْمَلِكُ',
        transliteration: 'el-Melik',
        source: 'Esma-ül Hüsna',
      },
      en: {
        content: 'The King — the absolute sovereign of all creation.',
        arabicText: 'الْمَلِكُ',
        transliteration: 'al-Malik',
        source: "Asma' ul-Husna",
      },
    },
  },
  {
    type: 'esma',
    category: 'dhikr',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Her türlü kusur ve eksiklikten münezzeh olan.',
        arabicText: 'الْقُدُّوسُ',
        transliteration: 'el-Kuddûs',
        source: 'Esma-ül Hüsna',
      },
      en: {
        content: 'The Most Holy — pure and free from all imperfection.',
        arabicText: 'الْقُدُّوسُ',
        transliteration: 'al-Quddūs',
        source: "Asma' ul-Husna",
      },
    },
  },
  {
    type: 'esma',
    category: 'dhikr',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Kullarına güvenlik ve huzur veren.',
        arabicText: 'السَّلَامُ',
        transliteration: 'es-Selâm',
        source: 'Esma-ül Hüsna',
      },
      en: {
        content: 'The Source of Peace — granting safety and tranquility.',
        arabicText: 'السَّلَامُ',
        transliteration: 'as-Salām',
        source: "Asma' ul-Husna",
      },
    },
  },
  {
    type: 'esma',
    category: 'dhikr',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Her şeyi görüp gözeten, koruyup kollayan.',
        arabicText: 'الْحَفِيظُ',
        transliteration: 'el-Hafîz',
        source: 'Esma-ül Hüsna',
      },
      en: {
        content: 'The Preserver — the guardian who watches over everything.',
        arabicText: 'الْحَفِيظُ',
        transliteration: 'al-Hafīẓ',
        source: "Asma' ul-Husna",
      },
    },
  },
  // HOPE - morning
  {
    type: 'verse',
    category: 'hope',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Allah, hiçbir nefse gücünün üzerinde bir şey yüklemez.',
        source: 'Bakara Suresi, 286',
        transliteration: null,
      },
      en: {
        content: 'Allah does not burden a soul beyond that it can bear.',
        source: 'Surah Al-Baqarah, 286',
        transliteration: null,
      },
    },
  },
  {
    type: 'verse',
    category: 'hope',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Şüphesiz, zorlukla birlikte bir kolaylık vardır.',
        source: 'İnşirah Suresi, 6',
        transliteration: null,
      },
      en: {
        content: 'Indeed, with hardship will be ease.',
        source: 'Surah Ash-Sharh, 6',
        transliteration: null,
      },
    },
  },
  {
    type: 'hadith',
    category: 'hope',
    recommendedTime: 'evening',
    translations: {
      tr: {
        content: 'Allah\'ın rahmeti gazabını geçmiştir.',
        source: 'Buhârî, Tevhid 22',
        transliteration: null,
      },
      en: {
        content: 'Allah\'s mercy has preceded His wrath.',
        source: 'Sahih al-Bukhari',
        transliteration: null,
      },
    },
  },
  // PURPOSE - morning
  {
    type: 'verse',
    category: 'purpose',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Ben cinleri ve insanları ancak bana ibadet etsinler diye yarattım.',
        source: 'Zâriyât Suresi, 56',
        transliteration: null,
      },
      en: {
        content: 'I did not create jinn and humans except to worship Me.',
        source: 'Surah Adh-Dhariyat, 56',
        transliteration: null,
      },
    },
  },
  {
    type: 'hadith',
    category: 'purpose',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Dünya ahiretin tarlasıdır.',
        source: 'Keşfü\'l-Hafâ',
        transliteration: null,
      },
      en: {
        content: 'The world is a farm for the hereafter.',
        source: 'Kashf al-Khafa',
        transliteration: null,
      },
    },
  },
  {
    type: 'verse',
    category: 'purpose',
    recommendedTime: 'noon',
    translations: {
      tr: {
        content: 'Her nefis ölümü tadacaktır. Sonra bize döndürüleceksiniz.',
        source: 'Ankebût Suresi, 57',
        transliteration: null,
      },
      en: {
        content: 'Every soul will taste death. Then to Us you will be returned.',
        source: 'Surah Al-Ankabut, 57',
        transliteration: null,
      },
    },
  },
  // WORSHIP - morning
  {
    type: 'hadith',
    category: 'worship',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Namaz dinin direğidir.',
        source: 'Tirmizî, İman 8',
        transliteration: null,
      },
      en: {
        content: 'Prayer is the pillar of religion.',
        source: 'Tirmidhi',
        transliteration: null,
      },
    },
  },
  {
    type: 'hadith',
    category: 'worship',
    recommendedTime: 'evening',
    translations: {
      tr: {
        content: 'Amellerin Allah\'a en sevimli olanı, az da olsa devamlı olanıdır.',
        source: 'Buhârî, Rikak 18',
        transliteration: null,
      },
      en: {
        content: 'The most beloved deeds to Allah are those done consistently, even if small.',
        source: 'Sahih al-Bukhari',
        transliteration: null,
      },
    },
  },
  {
    type: 'verse',
    category: 'worship',
    recommendedTime: 'noon',
    translations: {
      tr: {
        content: 'Namaz, müminler üzerine vakitli olarak farz kılınmıştır.',
        source: 'Nisâ Suresi, 103',
        transliteration: null,
      },
      en: {
        content: 'Indeed, prayer has been decreed upon the believers a decree of specified times.',
        source: 'Surah An-Nisa, 103',
        transliteration: null,
      },
    },
  },
  // PRAYER - morning
  {
    type: 'prayer',
    category: 'prayer',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Allahümme bike asbahnâ ve bike emseynâ ve bike nahyâ ve bike nemûtü ve ileyken-nüşûr.',
        source: 'Sabah Duası',
        transliteration: 'Allahümme bike asbahnâ ve bike emseynâ...',
      },
      en: {
        content: 'O Allah, by You we enter the morning, by You we enter the evening, by You we live, by You we die, and to You is the resurrection.',
        source: 'Morning Supplication',
        transliteration: 'Allāhumma bika aṣbaḥnā wa bika amsaynā...',
      },
    },
  },
  {
    type: 'prayer',
    category: 'prayer',
    recommendedTime: 'evening',
    translations: {
      tr: {
        content: 'Allahümme bike emseynâ ve bike asbahnâ ve bike nahyâ ve bike nemûtü ve ileykel masîr.',
        source: 'Akşam Duası',
        transliteration: 'Allahümme bike emseynâ...',
      },
      en: {
        content: 'O Allah, by You we enter the evening, by You we enter the morning, by You we live, by You we die, and to You is the final return.',
        source: 'Evening Supplication',
        transliteration: 'Allāhumma bika amsaynā...',
      },
    },
  },
  {
    type: 'prayer',
    category: 'prayer',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver ve bizi ateş azabından koru.',
        source: 'Bakara Suresi, 201',
        transliteration: null,
      },
      en: {
        content: 'Our Lord, give us in this world good and in the hereafter good, and protect us from the punishment of the Fire.',
        source: 'Surah Al-Baqarah, 201',
        transliteration: null,
      },
    },
  },
  // DHIKR - any
  {
    type: 'dhikr',
    category: 'dhikr',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Sübhânallâhi ve bihamdihî, sübhânallâhil azîm.',
        source: 'Buhârî, Daavât 65',
        transliteration: 'Subhānallāhi wa biḥamdihī, subhānallāhil ʿaẓīm',
      },
      en: {
        content: 'Glory be to Allah and His praise. Glory be to Allah the Magnificent.',
        source: 'Sahih al-Bukhari',
        transliteration: 'Subhānallāhi wa biḥamdihī, subhānallāhil ʿaẓīm',
      },
    },
  },
  {
    type: 'dhikr',
    category: 'dhikr',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Lâ ilâhe illallâh vahdehû lâ şerîke leh, lehül mülkü ve lehül hamdü ve hüve alâ külli şey\'in kadîr.',
        source: 'Sabah Zikri',
        transliteration: 'Lā ilāha illallāh waḥdahu lā sharīka lah...',
      },
      en: {
        content: 'There is no god but Allah alone, He has no partner, to Him belongs the dominion and to Him belongs praise, and He is over all things capable.',
        source: 'Morning Dhikr',
        transliteration: 'Lā ilāha illallāh waḥdahu lā sharīka lah...',
      },
    },
  },
  {
    type: 'dhikr',
    category: 'dhikr',
    recommendedTime: 'evening',
    translations: {
      tr: {
        content: 'Estağfirullâhel azîm ellezî lâ ilâhe illâ hüvel hayyel kayyûme ve etûbu ileyh.',
        source: 'İstiğfar Duası',
        transliteration: 'Astaghfirullāhal ʿaẓīm alladhī lā ilāha illā huwal ḥayyul qayyūm...',
      },
      en: {
        content: 'I seek forgiveness from Allah the Magnificent, besides whom there is no god, the Ever-Living, the Sustainer, and I repent to Him.',
        source: 'Istighfar',
        transliteration: 'Astaghfirullāhal ʿaẓīm...',
      },
    },
  },
  // Hope - evening
  {
    type: 'verse',
    category: 'hope',
    recommendedTime: 'evening',
    translations: {
      tr: {
        content: 'Allah, O\'na tevekkül edene yeter.',
        source: 'Talâk Suresi, 3',
        transliteration: null,
      },
      en: {
        content: 'Allah is sufficient for whoever relies upon Him.',
        source: 'Surah At-Talaq, 3',
        transliteration: null,
      },
    },
  },
  {
    type: 'verse',
    category: 'hope',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Rabbiniz şöyle dedi: "Bana dua edin, size karşılık vereyim."',
        source: 'Mü\'min Suresi, 60',
        transliteration: null,
      },
      en: {
        content: 'Your Lord said: "Call upon Me; I will respond to you."',
        source: 'Surah Ghafir, 60',
        transliteration: null,
      },
    },
  },
  // Purpose - evening
  {
    type: 'hadith',
    category: 'purpose',
    recommendedTime: 'evening',
    translations: {
      tr: {
        content: 'İnsanların en hayırlısı, insanlara en faydalı olanıdır.',
        source: 'Dârekutnî',
        transliteration: null,
      },
      en: {
        content: 'The best of people are those most beneficial to others.',
        source: 'Daraqutni',
        transliteration: null,
      },
    },
  },
  // Worship - any
  {
    type: 'hadith',
    category: 'worship',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Gülümsemen kardeşinin yüzüne sadakadır.',
        source: 'Tirmizî, Birr 36',
        transliteration: null,
      },
      en: {
        content: 'Your smile in the face of your brother is charity.',
        source: 'Tirmidhi',
        transliteration: null,
      },
    },
  },
  // Worship - morning
  {
    type: 'worship',
    category: 'worship',
    recommendedTime: 'morning',
    translations: {
      tr: {
        content: 'Sabah namazından sonra oturup güneş doğana kadar Allah\'ı zikreden kimse için tam bir hac ve umre sevabı vardır.',
        source: 'Tirmizî, Salât 585',
        transliteration: null,
      },
      en: {
        content: 'Whoever prays Fajr then sits remembering Allah until sunrise will have the reward of a complete Hajj and Umrah.',
        source: 'Tirmidhi, Salat 585',
        transliteration: null,
      },
    },
  },
  {
    type: 'worship',
    category: 'worship',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Kolaylaştırınız, zorlaştırmayınız; müjdeleyiniz, nefret ettirmeyiniz.',
        source: 'Buhârî, İlim 11',
        transliteration: null,
      },
      en: {
        content: 'Make things easy and do not make them difficult; give glad tidings and do not drive people away.',
        source: 'Bukhari, Knowledge 11',
        transliteration: null,
      },
    },
  },
  {
    type: 'worship',
    category: 'worship',
    recommendedTime: 'noon',
    translations: {
      tr: {
        content: 'Amellerin Allah\'a en sevimli olanı, az da olsa devamlı yapılanlardır.',
        source: 'Buhârî, Rikak 18',
        transliteration: null,
      },
      en: {
        content: 'The most beloved deeds to Allah are those done consistently, even if they are small.',
        source: 'Bukhari, Ar-Riqaq 18',
        transliteration: null,
      },
    },
  },
  {
    type: 'worship',
    category: 'worship',
    recommendedTime: 'evening',
    translations: {
      tr: {
        content: 'Yatağına gittiğinde 33 kez Sübhânallah, 33 kez Elhamdülillah, 34 kez Allahü Ekber de; bu, bir hizmetçiden senin için daha hayırlıdır.',
        source: 'Buhârî, Fedâilü\'s-sahâbe 9',
        transliteration: null,
      },
      en: {
        content: 'When you go to bed say SubhanAllah 33 times, Alhamdulillah 33 times, and Allahu Akbar 34 times; this is better for you than a servant.',
        source: 'Bukhari, Virtues of the Companions 9',
        transliteration: null,
      },
    },
  },
  {
    type: 'worship',
    category: 'worship',
    recommendedTime: 'any',
    translations: {
      tr: {
        content: 'Kim bir güçlüğü giderirse, Allah da ona dünyada ve ahirette iki güçlüğü giderir.',
        source: 'Müslim, Zikir 38',
        transliteration: null,
      },
      en: {
        content: 'Whoever relieves a hardship from a believer, Allah will relieve one of his hardships on the Day of Resurrection.',
        source: 'Muslim, Dhikr 38',
        transliteration: null,
      },
    },
  },
  // Dhikr - noon
  {
    type: 'dhikr',
    category: 'dhikr',
    recommendedTime: 'noon',
    translations: {
      tr: {
        content: 'Hasbiyallâhu lâ ilâhe illâ hû, aleyhi tevekkeltü ve hüve rabbül arşil azîm.',
        source: 'Tevbe Suresi, 129',
        transliteration: 'Ḥasbiyallāhu lā ilāha illā hū...',
      },
      en: {
        content: 'Allah is sufficient for me; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne.',
        source: 'Surah At-Tawbah, 129',
        transliteration: 'Ḥasbiyallāhu lā ilāha illā hū...',
      },
    },
  },
];

async function seed() {
  await client.connect();
  console.log('Connected to database');

  // Tabloyu oluştur (synchronize:true zaten yapıyor ama güvenlik için)
  await client.query(`
    CREATE TABLE IF NOT EXISTS content (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR NOT NULL,
      category VARCHAR NOT NULL,
      "recommendedTime" VARCHAR NOT NULL DEFAULT 'any',
      date DATE,
      translations JSONB NOT NULL,
      "audioUrl" VARCHAR,
      "imageUrl" VARCHAR,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  // Mevcut seed datayı temizle
  await client.query(`DELETE FROM content`);

  // İçerikleri ekle
  for (const item of contents) {
    await client.query(
      `INSERT INTO content (type, category, "recommendedTime", translations, "isActive")
       VALUES ($1, $2, $3, $4, true)`,
      [item.type, item.category, item.recommendedTime, JSON.stringify(item.translations)]
    );
  }

  const { rows } = await client.query('SELECT COUNT(*) FROM content');
  console.log(`✓ ${rows[0].count} içerik eklendi`);

  await client.end();
}

seed().catch(console.error);
