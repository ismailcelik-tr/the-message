import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const TO_EMAIL = 'ismailceliktr00@gmail.com';
const FROM_EMAIL = 'noreply@cagriapp.com'; // Resend'de verify edilecek domain

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    const html = `
      <h2>Yeni Uygulama Geri Bildirimi</h2>
      <p><strong>Mesaj:</strong><br>${record.message}</p>
      ${record.email ? `<p><strong>Yanıt e-postası:</strong> ${record.email}</p>` : ''}
      <p><strong>Kullanıcı ID:</strong> ${record.user_id ?? 'Anonim'}</p>
      <p><strong>Dil:</strong> ${record.locale}</p>
      <p><strong>Tarih:</strong> ${record.created_at}</p>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        subject: `Çağrı — Yeni Geri Bildirim`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
