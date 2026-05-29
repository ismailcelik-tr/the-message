import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ISSUE_LABELS: Record<string, string> = {
  wrong_text: 'Metin hatalı veya eksik',
  missing_text: 'Metnin bir kısmı eksik',
  wrong_source: 'Kaynak (sure/hadis no) hatalı',
  other: 'Diğer',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  verse: 'Ayet',
  hadith: 'Hadis',
  prayer: 'Dua',
  dhikr: 'Zikir',
  worship: 'İbadet',
  esma: 'Esmâü\'l-Hüsnâ',
};

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const table = payload.table; // 'content_feedback' or 'app_feedback'

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const toEmail = Deno.env.get('FEEDBACK_EMAIL') ?? 'ismailceliktr00@gmail.com';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set, skipping email');
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let html = '';
    let subject = '';

    // Check if payload is App Feedback or Content Feedback
    if (table === 'app_feedback' || !record.content_id) {
      // General App Feedback
      let userEmail: string | null = null;
      if (record.user_id) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(record.user_id);
          userEmail = userData?.user?.email ?? null;
        } catch (err) {
          console.error('Error fetching user:', err);
        }
      }

      subject = `[Çağrı] Genel Geri Bildirim`;
      html = `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F4F7F6; margin: 0; padding: 24px; }
  .card { background: #fff; border-radius: 16px; max-width: 560px; margin: 0 auto; overflow: hidden; border: 1px solid #DDE8E3; }
  .header { background: #2A4B3D; padding: 24px 28px; }
  .logo { color: #fff; font-size: 22px; font-weight: 300; letter-spacing: 2px; margin: 0; }
  .subtitle { color: #7FA899; font-size: 10px; font-weight: 600; letter-spacing: 5px; margin: 4px 0 0; }
  .body { padding: 24px 28px; }
  .badge { display: inline-block; background: #2A4B3D22; color: #2A4B3D; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 10px; border-radius: 20px; margin-bottom: 16px; }
  .content-box { background: #F4F7F6; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 3px solid #2A4B3D; }
  .content-text { color: #1A2E26; font-size: 15px; line-height: 1.7; margin: 0; }
  .row { display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start; }
  .label { color: #7FA899; font-size: 12px; font-weight: 600; min-width: 120px; padding-top: 2px; }
  .value { color: #1A2E26; font-size: 14px; flex: 1; }
  .footer { background: #F4F7F6; padding: 16px 28px; text-align: center; color: #7FA899; font-size: 12px; border-top: 1px solid #DDE8E3; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <p class="logo">Çağrı</p>
    <p class="subtitle">THE MESSAGE</p>
  </div>
  <div class="body">
    <div class="badge">YENİ UYGULAMA GERİ BİLDİRİMİ</div>
    <div class="content-box">
      <p class="content-text">${record.message}</p>
    </div>
    ${record.email ? `<div class="row"><span class="label">Yanıt E-postası</span><span class="value">${record.email}</span></div>` : ''}
    <div class="row"><span class="label">Dil</span><span class="value">${record.locale === 'tr' ? 'Türkçe' : 'İngilizce'}</span></div>
    <div class="row"><span class="label">Kullanıcı</span><span class="value">${userEmail ? `${userEmail}<br/><span style="font-size:11px;color:#7FA899">${record.user_id}</span>` : record.user_id ? `<span style="font-size:11px;color:#7FA899">${record.user_id}</span>` : 'Anonim'}</span></div>
    <div class="row"><span class="label">Tarih</span><span class="value">${record.created_at ? new Date(record.created_at).toLocaleString('tr-TR') : '—'}</span></div>
  </div>
  <div class="footer">Çağrı · The Message · Geri Bildirim Sistemi</div>
</div>
</body>
</html>`;
    } else {
      // Content Feedback
      // Fetch content text
      const { data: contentItem } = await supabase
        .from('content_items')
        .select('translations')
        .eq('id', record.content_id)
        .single();

      const contentText = contentItem?.translations?.tr?.content
        ?? contentItem?.translations?.en?.content
        ?? '—';
      const contentSource = contentItem?.translations?.tr?.source
        ?? contentItem?.translations?.en?.source
        ?? null;

      // Fetch user email if user_id present
      let userEmail: string | null = null;
      if (record.user_id) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(record.user_id);
          userEmail = userData?.user?.email ?? null;
        } catch (err) {
          console.error('Error fetching user:', err);
        }
      }

      const issueLabel = ISSUE_LABELS[record.issue_type] ?? record.issue_type;
      const contentTypeLabel = CONTENT_TYPE_LABELS[record.content_type] ?? record.content_type;

      subject = `[Çağrı] ${issueLabel} — ${contentTypeLabel}`;
      html = `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F4F7F6; margin: 0; padding: 24px; }
  .card { background: #fff; border-radius: 16px; max-width: 560px; margin: 0 auto; overflow: hidden; border: 1px solid #DDE8E3; }
  .header { background: #2A4B3D; padding: 24px 28px; }
  .logo { color: #fff; font-size: 22px; font-weight: 300; letter-spacing: 2px; margin: 0; }
  .subtitle { color: #7FA899; font-size: 10px; font-weight: 600; letter-spacing: 5px; margin: 4px 0 0; }
  .body { padding: 24px 28px; }
  .badge { display: inline-block; background: #2A4B3D22; color: #2A4B3D; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 10px; border-radius: 20px; margin-bottom: 16px; }
  .content-box { background: #F4F7F6; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 3px solid #2A4B3D; }
  .content-text { color: #1A2E26; font-size: 15px; line-height: 1.7; margin: 0 0 8px; }
  .content-source { color: #7FA899; font-size: 12px; margin: 0; }
  .row { display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start; }
  .label { color: #7FA899; font-size: 12px; font-weight: 600; min-width: 120px; padding-top: 2px; }
  .value { color: #1A2E26; font-size: 14px; flex: 1; }
  .note-box { background: #FFF8E7; border: 1px solid #F0DFA0; border-radius: 10px; padding: 12px 16px; margin: 16px 0 0; }
  .note-label { color: #B8860B; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin: 0 0 6px; }
  .note-text { color: #5C4A00; font-size: 14px; margin: 0; }
  .footer { background: #F4F7F6; padding: 16px 28px; text-align: center; color: #7FA899; font-size: 12px; border-top: 1px solid #DDE8E3; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <p class="logo">Çağrı</p>
    <p class="subtitle">THE MESSAGE</p>
  </div>
  <div class="body">
    <div class="badge">YENİ İÇERİK BİLDİRİMİ</div>
    <div class="content-box">
      <p class="content-text">${contentText}</p>
      ${contentSource ? `<p class="content-source">(${contentSource})</p>` : ''}
    </div>
    <div class="row"><span class="label">Sorun türü</span><span class="value">${issueLabel}</span></div>
    <div class="row"><span class="label">İçerik türü</span><span class="value">${contentTypeLabel}</span></div>
    <div class="row"><span class="label">İçerik ID</span><span class="value" style="font-size:12px;color:#7FA899">${record.content_id}</span></div>
    <div class="row"><span class="label">Dil</span><span class="value">${record.locale === 'tr' ? 'Türkçe' : 'İngilizce'}</span></div>
    <div class="row"><span class="label">Kullanıcı</span><span class="value">${userEmail ? `${userEmail}<br/><span style="font-size:11px;color:#7FA899">${record.user_id}</span>` : record.user_id ? `<span style="font-size:11px;color:#7FA899">${record.user_id}</span>` : 'Anonim'}</span></div>
    ${record.note ? `<div class="note-box"><p class="note-label">NOT</p><p class="note-text">${record.note}</p></div>` : ''}
  </div>
  <div class="footer">Çağrı · The Message · İçerik Bildiri Sistemi</div>
</div>
</body>
</html>`;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Çağrı <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('notify-feedback error:', e);
    return new Response('error', { status: 500 });
  }
});
