import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ApiResponse,
  PushAudienceCount,
  PushAudienceFilters,
  PushCampaign,
  PushCampaignRequest,
  PushPlatform,
  SupportedLocale,
} from '@the-message/shared';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const SECRET_STORAGE_KEY = 'the-message-admin-push-secret';

type SendMode = 'now' | 'scheduled';

interface FormState {
  title: string;
  body: string;
  enabledOnly: boolean;
  locale: '' | SupportedLocale;
  platform: '' | PushPlatform;
  email: string;
  sendMode: SendMode;
  scheduledLocal: string;
}

const initialForm: FormState = {
  title: 'Çağrı',
  body: '',
  enabledOnly: true,
  locale: '',
  platform: '',
  email: '',
  sendMode: 'now',
  scheduledLocal: '',
};

async function apiRequest<T>(
  path: string,
  secret: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-push-secret': secret,
      ...options?.headers,
    },
  });

  const json = await res.json() as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? `API error: ${res.status}`);
  }
  return json.data as T;
}

function filtersFromForm(form: FormState): PushAudienceFilters {
  return {
    enabledOnly: form.enabledOnly,
    ...(form.locale ? { locale: form.locale } : {}),
    ...(form.platform ? { platform: form.platform } : {}),
    ...(form.email.trim() ? { email: form.email.trim() } : {}),
  };
}

function scheduledForFromForm(form: FormState): string | undefined {
  if (form.sendMode !== 'scheduled' || !form.scheduledLocal) return undefined;
  return new Date(`${form.scheduledLocal}:00+03:00`).toISOString();
}

function formatDate(value?: string): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

function PhonePreview({ platform, title, body }: { platform: PushPlatform; title: string; body: string }) {
  return (
    <div className={`phone phone-${platform}`}>
      <div className="phone-bar">
        <span>{platform === 'ios' ? '9:41' : '09:41'}</span>
        <span>{platform === 'ios' ? '5G 100%' : 'LTE 100%'}</span>
      </div>
      <div className="notification">
        <div className="app-icon">Ç</div>
        <div className="notification-copy">
          <div className="notification-meta">
            <span>Çağrı</span>
            <span>şimdi</span>
          </div>
          <strong>{title || 'Bildirim başlığı'}</strong>
          <p>{body || 'Bildirim metni burada görünecek.'}</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [secret, setSecret] = useState(() => localStorage.getItem(SECRET_STORAGE_KEY) ?? '');
  const [form, setForm] = useState<FormState>(initialForm);
  const [audience, setAudience] = useState<PushAudienceCount | null>(null);
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const filters = useMemo(() => filtersFromForm(form), [form]);
  const canSubmit = secret.trim() && form.title.trim() && form.body.trim()
    && (form.sendMode === 'now' || form.scheduledLocal);

  const saveSecret = () => {
    localStorage.setItem(SECRET_STORAGE_KEY, secret.trim());
    setMessage('Admin secret kaydedildi.');
  };

  const loadCampaigns = async () => {
    if (!secret.trim()) return;
    const data = await apiRequest<PushCampaign[]>('/admin/push/campaigns', secret.trim());
    setCampaigns(data);
  };

  const refreshAudience = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await apiRequest<PushAudienceCount>('/admin/push/audience-count', secret.trim(), {
        method: 'POST',
        body: JSON.stringify(filters),
      });
      setAudience(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Hedef kitle alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const submitCampaign = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setMessage('');
    try {
      const request: PushCampaignRequest = {
        title: form.title.trim(),
        body: form.body.trim(),
        filters,
        scheduledFor: scheduledForFromForm(form),
      };

      const campaign = await apiRequest<PushCampaign>('/admin/push/campaigns', secret.trim(), {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (form.sendMode === 'now') {
        const sent = await apiRequest<PushCampaign>(`/admin/push/campaigns/${campaign.id}/send`, secret.trim(), {
          method: 'POST',
        });
        setMessage(`Gönderildi: ${sent.sentCount} başarılı, ${sent.failedCount} hata.`);
      } else {
        setMessage(`Zamanlandı: ${formatDate(campaign.scheduledFor)}`);
      }

      setForm((current) => ({ ...current, body: '', scheduledLocal: '' }));
      setAudience(null);
      await loadCampaigns();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kampanya kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns().catch(() => undefined);
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">TheMessage Admin</p>
          <h1>Push Notification Tool</h1>
        </div>
        <div className="secret-box">
          <input
            type="password"
            placeholder="ADMIN_PUSH_SECRET"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
          <button type="button" onClick={saveSecret}>Kaydet</button>
        </div>
      </header>

      <section className="workspace">
        <form className="composer" onSubmit={(event) => { event.preventDefault(); submitCampaign(); }}>
          <div className="section-title">
            <h2>Mesaj</h2>
            <button type="button" onClick={refreshAudience} disabled={!secret.trim() || loading}>
              Hedefi Hesapla
            </button>
          </div>

          <label>
            Başlık
            <input
              value={form.title}
              maxLength={80}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>

          <label>
            Mesaj
            <textarea
              value={form.body}
              rows={5}
              maxLength={220}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              placeholder="Kullanıcıya gidecek bildirim metni"
            />
          </label>

          <div className="filters-grid">
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.enabledOnly}
                onChange={(event) => setForm({ ...form, enabledOnly: event.target.checked })}
              />
              Sadece bildirim açık kullanıcılar
            </label>

            <label>
              Dil
              <select value={form.locale} onChange={(event) => setForm({ ...form, locale: event.target.value as FormState['locale'] })}>
                <option value="">Tümü</option>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </label>

            <label>
              Platform
              <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value as FormState['platform'] })}>
                <option value="">Tümü</option>
                <option value="ios">iOS</option>
                <option value="android">Android</option>
              </select>
            </label>

            <label>
              E-posta
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="opsiyonel"
              />
            </label>
          </div>

          <div className="send-row">
            <label className="radio-row">
              <input
                type="radio"
                checked={form.sendMode === 'now'}
                onChange={() => setForm({ ...form, sendMode: 'now' })}
              />
              Hemen gönder
            </label>
            <label className="radio-row">
              <input
                type="radio"
                checked={form.sendMode === 'scheduled'}
                onChange={() => setForm({ ...form, sendMode: 'scheduled' })}
              />
              Zamanla
            </label>
            <input
              type="datetime-local"
              value={form.scheduledLocal}
              disabled={form.sendMode !== 'scheduled'}
              onChange={(event) => setForm({ ...form, scheduledLocal: event.target.value })}
            />
          </div>

          <div className="submit-row">
            <div className="audience-pill">
              {audience ? `${audience.tokens} token / ${audience.users} kullanıcı` : 'Hedef henüz hesaplanmadı'}
            </div>
            <button type="submit" disabled={!canSubmit || loading}>
              {loading ? 'İşleniyor' : form.sendMode === 'now' ? 'Gönder' : 'Zamanla'}
            </button>
          </div>

          {message && <p className="message">{message}</p>}
        </form>

        <aside className="preview">
          <div className="section-title">
            <h2>Önizleme</h2>
            <span>iOS / Android</span>
          </div>
          <PhonePreview platform="ios" title={form.title} body={form.body} />
          <PhonePreview platform="android" title={form.title} body={form.body} />
        </aside>
      </section>

      <section className="history">
        <div className="section-title">
          <h2>Gönderim Geçmişi</h2>
          <button type="button" onClick={() => loadCampaigns()} disabled={!secret.trim()}>Yenile</button>
        </div>
        <div className="table">
          <div className="table-head">
            <span>Mesaj</span>
            <span>Durum</span>
            <span>Hedef</span>
            <span>Zaman</span>
          </div>
          {campaigns.map((campaign) => (
            <div className="table-row" key={campaign.id}>
              <span>
                <strong>{campaign.title}</strong>
                <small>{campaign.body}</small>
              </span>
              <span className={`status status-${campaign.status}`}>{campaign.status}</span>
              <span>{campaign.sentCount}/{campaign.targetCount} başarılı</span>
              <span>{formatDate(campaign.sentAt ?? campaign.scheduledFor ?? campaign.createdAt)}</span>
            </div>
          ))}
          {campaigns.length === 0 && <p className="empty">Henüz kampanya yok.</p>}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
