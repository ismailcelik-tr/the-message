import React, { useEffect, useState } from 'react';

interface UsersManagementProps {
  token: string;
  apiUrl: string;
}

interface UserItem {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string;
  role: string;
  locale: string;
  timezone: string;
  platform: string;
  notificationEnabled: boolean;
  preferences: any;
}

export function UsersManagement({ token, apiUrl }: UsersManagementProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Bookmarks Modal States
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message ?? `API Hatası: ${res.status}`);
    }
    return json.data as T;
  }

  const loadUsers = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await apiRequest<{ items: UserItem[]; total: number }>(
        `/admin/users?page=${page}&limit=${limit}`,
      );
      setUsers(data.items);
      setTotal(data.total);
    } catch (error: any) {
      setMessage(error.message || 'Kullanıcılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers().catch(() => undefined);
  }, [page, limit]);

  const loadBookmarks = async (user: UserItem) => {
    setSelectedUser(user);
    setBookmarksLoading(true);
    setShowBookmarks(true);
    try {
      const data = await apiRequest<any[]>(`/admin/users/${user.id}/bookmarks`);
      setBookmarks(data);
    } catch (error: any) {
      alert(error.message || 'Yer imleri yüklenemedi.');
      setShowBookmarks(false);
    } finally {
      setBookmarksLoading(false);
    }
  };

  function formatDate(value?: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Europe/Istanbul',
    }).format(new Date(value));
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2 style={{ fontSize: '16px', color: '#2a4b3d', fontWeight: 'bold' }}>Kullanıcı Listesi</h2>
        <span style={{ fontSize: '13px', color: '#6c8378' }}>
          Toplam Kayıtlı: {users.length < limit && page === 1 ? users.length : total} kullanıcı
        </span>
      </div>

      {message && <p className="message" style={{ marginBottom: 16 }}>{message}</p>}

      <section className="history" style={{ marginTop: 0 }}>
        <div className="table">
          <div className="table-head" style={{ gridTemplateColumns: '1.2fr 0.8fr 1.2fr 0.8fr 0.8fr 1fr 1fr' }}>
            <span>E-posta / ID</span>
            <span>Platform / Dil</span>
            <span>Saat Dilimi / Bildirim</span>
            <span>Kategori Tercihleri</span>
            <span>Sıklık</span>
            <span>Kayıt Tarihi</span>
            <span>Aksiyonlar</span>
          </div>

          {users.map((user) => {
            const prefs = user.preferences ?? {};
            const cats = prefs.categoryPreferences ?? {};
            const activeCats = Object.keys(cats).filter((k) => cats[k]);
            
            return (
              <div className="table-row" key={user.id} style={{ gridTemplateColumns: '1.2fr 0.8fr 1.2fr 0.8fr 0.8fr 1fr 1fr', padding: '16px 10px' }}>
                <span style={{ display: 'grid', gap: '4px', minWidth: 0 }}>
                  <strong style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</strong>
                  <small style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace' }}>{user.id}</small>
                </span>
                <span>
                  <span className="badge badge-type" style={{ marginRight: '6px' }}>{user.platform}</span>
                  <span className="badge badge-category" style={{ background: '#edf5f1', color: '#2a4b3d' }}>{user.locale.toUpperCase()}</span>
                </span>
                <span>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{user.timezone}</div>
                  <span className={`badge ${user.notificationEnabled ? 'badge-active' : 'badge-inactive'}`}>
                    {user.notificationEnabled ? 'Açık' : 'Kapalı'}
                  </span>
                </span>
                <span style={{ fontSize: '12px' }}>
                  {activeCats.length > 0 ? activeCats.join(', ') : 'Hiçbiri'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  {prefs.notificationFrequency ? prefs.notificationFrequency.toUpperCase() : '-'}
                </span>
                <span style={{ fontSize: '13px', color: '#6c8378' }}>
                  {formatDate(user.createdAt)}
                </span>
                <span className="action-links">
                  <span className="action-link" onClick={() => loadBookmarks(user)}>
                    Kaydedilenler
                  </span>
                </span>
              </div>
            );
          })}

          {users.length === 0 && !loading && <p className="empty">Hiç kullanıcı bulunamadı.</p>}
        </div>
      </section>

      {/* Pagination controls */}
      {total > 0 && (
        <div className="submit-row" style={{ marginTop: 16, justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6c8378' }}>Her sayfada:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{
                padding: '4px 8px',
                border: '1px solid #cfdad4',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                width: 'auto',
                backgroundColor: '#fff'
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              style={{ minHeight: '32px', height: '32px', padding: '0 12px' }}
            >
              Önceki
            </button>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              Sayfa {page} / {Math.max(1, Math.ceil(total / limit))}
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
              disabled={page >= Math.ceil(total / limit) || loading}
              style={{ minHeight: '32px', height: '32px', padding: '0 12px' }}
            >
              Sonraki
            </button>
          </div>
        </div>
      )}

      {/* Bookmarks Modal */}
      {showBookmarks && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="section-title">
              <h2>{selectedUser.email} — Kaydedilen İçerikler</h2>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowBookmarks(false); setSelectedUser(null); setBookmarks([]); }}
                style={{ minHeight: '32px', height: '32px', padding: '0 12px' }}
              >
                Kapat
              </button>
            </div>

            {bookmarksLoading ? (
              <p style={{ textAlign: 'center', padding: '24px', color: '#6c8378' }}>Yükleniyor...</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px', overflowY: 'auto', maxHeight: '60vh', paddingRight: '8px' }}>
                {bookmarks.map((bookmark) => {
                  const snap = bookmark.snapshot ?? {};
                  const type = bookmark.content_type;
                  const text = snap.content ?? snap.body ?? snap.text ?? 'İçerik detayı yok';
                  const source = snap.source ?? '';

                  return (
                    <div key={bookmark.id} style={{ border: '1px solid #d8e2dd', borderRadius: '8px', padding: '12px', background: '#fcfdfe' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <span className="badge badge-type">{type.toUpperCase()}</span>
                        <span style={{ fontSize: '12px', color: '#6c8378' }}>
                          Kayıt: {formatDate(bookmark.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: 1.5, fontWeight: 500 }}>"{text}"</div>
                      {source && <div style={{ fontSize: '12px', color: '#6c8378', marginTop: '4px', fontStyle: 'italic' }}>— {source}</div>}
                    </div>
                  );
                })}
                {bookmarks.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#6c8378', padding: '24px' }}>
                    Bu kullanıcı henüz hiçbir içeriği kaydetmemiş.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
