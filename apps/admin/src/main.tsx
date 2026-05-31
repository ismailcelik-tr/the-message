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
import { supabase } from './supabase';
import { Login } from './components/Login';
import { ContentManagement } from './components/ContentManagement';
import { UsersManagement } from './components/UsersManagement';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

type SendMode = 'now' | 'scheduled';
type TabType = 'push' | 'content' | 'users';

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
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('push');

  // Push Campaign States
  const [form, setForm] = useState<FormState>(initialForm);
  const [audience, setAudience] = useState<PushAudienceCount | null>(null);
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const filters = useMemo(() => {
    return {
      enabledOnly: form.enabledOnly,
      ...(form.locale ? { locale: form.locale } : {}),
      ...(form.platform ? { platform: form.platform } : {}),
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
    };
  }, [form]);

  const canSubmit = form.title.trim() && form.body.trim()
    && (form.sendMode === 'now' || form.scheduledLocal);

  // Authenticate and verify admin status
  const verifyAdminAndSetSession = async (session: any) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        setToken(null);
        setUserEmail(null);
      } else {
        setToken(session.access_token);
        setUserEmail(session.user.email ?? '');
      }
    } catch {
      setToken(null);
      setUserEmail(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        verifyAdminAndSetSession(session);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        verifyAdminAndSetSession(session);
      } else {
        setToken(null);
        setUserEmail(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function apiRequest<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    if (!token) throw new Error('Oturum sonlanmış veya geçersiz.');

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    const json = await res.json() as ApiResponse<T>;
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message ?? `API Hatası: ${res.status}`);
    }
    return json.data as T;
  }

  const loadCampaigns = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<PushCampaign[]>('/admin/push/campaigns');
      setCampaigns(data);
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const refreshAudience = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await apiRequest<PushAudienceCount>('/admin/push/audience-count', {
        method: 'POST',
        body: JSON.stringify(filters),
      });
      setAudience(data);
    } catch (error: any) {
      setMessage(error.message || 'Hedef kitle alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const submitCampaign = async () => {
    if (!canSubmit || !token) return;

    setLoading(true);
    setMessage('');
    try {
      const request: PushCampaignRequest = {
        title: form.title.trim(),
        body: form.body.trim(),
        filters,
        scheduledFor: scheduledForFromForm(form),
      };

      const campaign = await apiRequest<PushCampaign>('/admin/push/campaigns', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (form.sendMode === 'now') {
        const sent = await apiRequest<PushCampaign>(`/admin/push/campaigns/${campaign.id}/send`, {
          method: 'POST',
        });
        setMessage(`Gönderildi: ${sent.sentCount} başarılı, ${sent.failedCount} hata.`);
      } else {
        setMessage(`Zamanlandı: ${formatDate(campaign.scheduledFor)}`);
      }

      setForm((current) => ({ ...current, body: '', scheduledLocal: '' }));
      setAudience(null);
      await loadCampaigns();
    } catch (error: any) {
      setMessage(error.message || 'Kampanya kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadCampaigns().catch(() => undefined);
    }
  }, [token]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="login-container">
        <p style={{ color: '#2a4b3d', fontWeight: 600 }}>Yükleniyor...</p>
      </div>
    );
  }

  if (!token) {
    return <Login onLoginSuccess={(t, email) => { setToken(t); setUserEmail(email); }} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Yönetim Paneli</h1>
          {userEmail && <small style={{ color: '#6c8378' }}>Giriş yapan: {userEmail}</small>}
        </div>
      </header>

      <nav className="tabs-bar">
        <button
          type="button"
          className={`tab-button ${activeTab === 'push' ? 'active' : ''}`}
          onClick={() => setActiveTab('push')}
        >
          Push Bildirimleri
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          İçerik Yönetimi
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Kullanıcılar & Kaydedilenler
        </button>
        <button
          type="button"
          className="logout-btn"
          style={{ marginLeft: 'auto' }}
          onClick={handleLogout}
        >
          Çıkış Yap
        </button>
      </nav>

      {activeTab === 'push' ? (
        <>
          <section className="workspace">
            <form className="composer" onSubmit={(event) => { event.preventDefault(); submitCampaign(); }}>
              <div className="section-title">
                <h2>Yeni Push Mesajı</h2>
                <button type="button" onClick={refreshAudience} disabled={loading}>
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
              <button type="button" onClick={() => loadCampaigns()} disabled={loading}>Yenile</button>
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
        </>
      ) : activeTab === 'content' ? (
        <ContentManagement token={token} apiUrl={API_URL} />
      ) : (
        <UsersManagement token={token} apiUrl={API_URL} />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
