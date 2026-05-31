import React, { useEffect, useState } from 'react';
import { ContentItem, MessageCategory, SupportedLocale } from '@the-message/shared';

interface ContentManagementProps {
  token: string;
  apiUrl: string;
}

interface AdminContentItem extends ContentItem {
  isActive: boolean;
}

export function ContentManagement({ token, apiUrl }: ContentManagementProps) {
  const [items, setItems] = useState<AdminContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Duplicates modal states
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);

  // Editor Modal States
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<AdminContentItem> | null>(null);
  const [editorLang, setEditorLang] = useState<SupportedLocale>('tr');

  // Editor Form Fields
  const [editType, setEditType] = useState('verse');
  const [editCategory, setEditCategory] = useState<MessageCategory>('hope');
  const [editRecommendedTime, setEditRecommendedTime] = useState('any');
  const [editDate, setEditDate] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Translations
  const [trContent, setTrContent] = useState('');
  const [trSource, setTrSource] = useState('');
  const [trArabic, setTrArabic] = useState('');
  const [trTransliteration, setTrTransliteration] = useState('');

  const [enContent, setEnContent] = useState('');
  const [enSource, setEnSource] = useState('');
  const [enArabic, setEnArabic] = useState('');
  const [enTransliteration, setEnTransliteration] = useState('');

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

  const loadContent = async () => {
    setLoading(true);
    setMessage('');
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      });

      const data = await apiRequest<{ items: AdminContentItem[]; total: number }>(
        `/admin/content?${queryParams.toString()}`,
      );
      setItems(data.items);
      setTotal(data.total);
    } catch (error: any) {
      setMessage(error.message || 'İçerikler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent().catch(() => undefined);
  }, [page, limit, categoryFilter, typeFilter, searchQuery]);

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>('/admin/content/duplicates');
      setDuplicateGroups(data);
      setShowDuplicates(true);
    } catch (error: any) {
      alert(error.message || 'Mükerrer kayıtlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const deleteDuplicateItem = async (id: string) => {
    if (!confirm('Bu mükerrer içeriği silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    try {
      await apiRequest(`/admin/content/${id}`, { method: 'DELETE' });
      // Refresh duplicates list
      const data = await apiRequest<any[]>('/admin/content/duplicates');
      setDuplicateGroups(data);
      await loadContent();
    } catch (error: any) {
      alert(error.message || 'Silme hatası.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingItem(null);
    setEditType('verse');
    setEditCategory('hope');
    setEditRecommendedTime('any');
    setEditDate('');
    setEditIsActive(true);

    // Clear Translations
    setTrContent('');
    setTrSource('');
    setTrArabic('');
    setTrTransliteration('');

    setEnContent('');
    setEnSource('');
    setEnArabic('');
    setEnTransliteration('');

    setEditorLang('tr');
    setShowEditor(true);
  };

  const handleOpenEdit = (item: AdminContentItem) => {
    setEditingItem(item);
    setEditType(item.type);
    setEditCategory(item.category);
    setEditRecommendedTime(item.recommendedTime);
    setEditDate(item.date || '');
    setEditIsActive(item.isActive);

    // Set Turkish Translations
    const tr = item.translations?.tr || {};
    setTrContent(tr.content || '');
    setTrSource(tr.source || '');
    setTrArabic(tr.arabicText || '');
    setTrTransliteration(tr.transliteration || '');

    // Set English Translations
    const en = item.translations?.en || {};
    setEnContent(en.content || '');
    setEnSource(en.source || '');
    setEnArabic(en.arabicText || '');
    setEnTransliteration(en.transliteration || '');

    setEditorLang('tr');
    setShowEditor(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trContent.trim() && !enContent.trim()) {
      alert('Lütfen en az bir dilde içerik giriniz.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: editType,
        category: editCategory,
        recommendedTime: editRecommendedTime,
        date: editDate || undefined,
        isActive: editIsActive,
        translations: {
          tr: {
            content: trContent.trim(),
            source: trSource.trim() || undefined,
            arabicText: trArabic.trim() || undefined,
            transliteration: trTransliteration.trim() || undefined,
          },
          en: {
            content: enContent.trim(),
            source: enSource.trim() || undefined,
            arabicText: enArabic.trim() || undefined,
            transliteration: enTransliteration.trim() || undefined,
          },
        },
      };

      if (editingItem?.id) {
        // Update existing item
        await apiRequest(`/admin/content/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('İçerik başarıyla güncellendi.');
      } else {
        // Create new item
        await apiRequest('/admin/content', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Yeni içerik başarıyla oluşturuldu.');
      }

      setShowEditor(false);
      await loadContent();
    } catch (error: any) {
      alert(error.message || 'Kaydetme hatası.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu içeriği kalıcı olarak silmek istediğinize emin misiniz?')) return;

    setLoading(true);
    try {
      await apiRequest(`/admin/content/${id}`, {
        method: 'DELETE',
      });
      setMessage('İçerik başarıyla silindi.');
      await loadContent();
    } catch (error: any) {
      alert(error.message || 'Silme hatası.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (item: AdminContentItem) => {
    setLoading(true);
    try {
      await apiRequest(`/admin/content/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      await loadContent();
    } catch (error: any) {
      alert(error.message || 'Durum değiştirme hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="toolbar-filters" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
              <option value="">Tüm Tipler</option>
              <option value="verse">Ayet (Verse)</option>
              <option value="hadith">Hadis (Hadith)</option>
              <option value="prayer">Dua (Prayer)</option>
              <option value="dhikr">Zikir (Dhikr)</option>
              <option value="esma">Esma (Esmaü'l-Hüsna)</option>
              <option value="worship">İbadet (Worship)</option>
            </select>

            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
              <option value="">Tüm Kategoriler</option>
              <option value="hope">Umut (Hope)</option>
              <option value="purpose">Amaç (Purpose)</option>
              <option value="worship">İbadet (Worship)</option>
              <option value="prayer">Dua (Prayer)</option>
              <option value="dhikr">Zikir (Dhikr)</option>
            </select>

            <form onSubmit={(e) => { e.preventDefault(); setSearchQuery(search); setPage(1); }} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Metin ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '7px 12px',
                  border: '1px solid #cfdad4',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '200px'
                }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '0 16px', minHeight: '36px' }}>
                Ara
              </button>
              {searchQuery && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setSearch(''); setSearchQuery(''); setPage(1); }}
                  style={{ padding: '0 12px', backgroundColor: '#f0f3f1', color: '#6c8378', minHeight: '36px' }}
                >
                  Temizle
                </button>
              )}
            </form>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-secondary" onClick={loadDuplicates} disabled={loading} style={{ minHeight: '36px' }}>
              Tekrar Eden Kayıtlar
            </button>
            <button type="button" onClick={handleOpenNew} disabled={loading} style={{ minHeight: '36px' }}>
              + Yeni İçerik Ekle
            </button>
          </div>
        </div>
      </div>

      {message && <p className="message" style={{ marginBottom: 16 }}>{message}</p>}

      <section className="history" style={{ marginTop: 0 }}>
        <div className="table">
          <div className="table-head">
            <span>İçerik (TR / EN)</span>
            <span>Tip / Kategori</span>
            <span>Durum</span>
            <span>Aksiyonlar</span>
          </div>

          {items.map((item) => {
            const tr = item.translations?.tr?.content || '';
            const en = item.translations?.en?.content || '';
            const previewText = tr || en;

            return (
              <div className="table-row" key={item.id} style={{ gridTemplateColumns: 'minmax(280px, 1fr) 180px 100px 140px' }}>
                <span style={{ display: 'grid', gap: '4px' }}>
                  <strong>{previewText}</strong>
                  {tr && en && <small style={{ margin: 0, fontStyle: 'italic' }}>EN: {en}</small>}
                </span>
                <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="badge badge-type">{item.type}</span>
                  <span className="badge badge-category">{item.category}</span>
                </span>
                <span>
                  <span
                    onClick={() => toggleStatus(item)}
                    className={`badge ${item.isActive ? 'badge-active' : 'badge-inactive'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {item.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </span>
                <span className="action-links">
                  <span className="action-link" onClick={() => handleOpenEdit(item)}>
                    Düzenle
                  </span>
                  <span className="action-link danger" onClick={() => handleDelete(item.id)}>
                    Sil
                  </span>
                </span>
              </div>
            );
          })}

          {items.length === 0 && !loading && <p className="empty">Hiç içerik bulunamadı.</p>}
        </div>
      </section>

      {/* Pagination controls */}
      {total > 0 && (
        <div className="submit-row" style={{ marginTop: 16, justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
            <span style={{ fontSize: '13px', color: '#6c8378', marginLeft: '8px' }}>
              Toplam {total} içerikten {Math.min(total, (page - 1) * limit + 1)}-{Math.min(total, page * limit)} arası gösteriliyor
            </span>
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

      {/* Editor Modal */}
      {showEditor && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSave}>
            <h2>{editingItem ? 'İçeriği Düzenle' : 'Yeni İçerik Ekle'}</h2>

            <div className="editor-grid">
              <label>
                Tip (Type)
                <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                  <option value="verse">Ayet (Verse)</option>
                  <option value="hadith">Hadis (Hadith)</option>
                  <option value="prayer">Dua (Prayer)</option>
                  <option value="dhikr">Zikir (Dhikr)</option>
                  <option value="esma">Esma (Esmaü'l-Hüsna)</option>
                  <option value="worship">İbadet (Worship)</option>
                </select>
              </label>

              <label>
                Kategori (Category)
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as MessageCategory)}>
                  <option value="hope">Umut (Hope)</option>
                  <option value="purpose">Amaç (Purpose)</option>
                  <option value="worship">İbadet (Worship)</option>
                  <option value="prayer">Dua (Prayer)</option>
                  <option value="dhikr">Zikir (Dhikr)</option>
                </select>
              </label>

              <label>
                Önerilen Zaman (Time)
                <select value={editRecommendedTime} onChange={(e) => setEditRecommendedTime(e.target.value)}>
                  <option value="any">Herhangi Bir Zaman (Any)</option>
                  <option value="morning">Sabah (Morning)</option>
                  <option value="midMorning">Kuşluk (Mid-Morning)</option>
                  <option value="noon">Öğle (Noon)</option>
                  <option value="afternoon">İkindi (Afternoon)</option>
                  <option value="evening">Akşam (Evening)</option>
                </select>
              </label>

              <label>
                Özel Tarih (Date - Opsiyonel)
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </label>

              <label className="check-row editor-full">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                İçerik Aktif mi? (Aktif olmayan içerikler mobil uygulamada listelenmez veya bildirim olarak gönderilmez)
              </label>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid #d8e2dd', margin: '8px 0' }} />

            <div>
              <div className="lang-tabs">
                <div
                  className={`lang-tab ${editorLang === 'tr' ? 'active' : ''}`}
                  onClick={() => setEditorLang('tr')}
                >
                  Türkçe (TR)
                </div>
                <div
                  className={`lang-tab ${editorLang === 'en' ? 'active' : ''}`}
                  onClick={() => setEditorLang('en')}
                >
                  English (EN)
                </div>
              </div>

              {editorLang === 'tr' ? (
                <div className="composer" style={{ border: 0, padding: 0, marginTop: 12 }}>
                  <label>
                    İçerik Metni (Content)
                    <textarea
                      value={trContent}
                      onChange={(e) => setTrContent(e.target.value)}
                      rows={4}
                      placeholder="İçerik metnini giriniz..."
                      required={editorLang === 'tr'}
                    />
                  </label>
                  <label>
                    Kaynak (Source - Opsiyonel)
                    <input
                      value={trSource}
                      onChange={(e) => setTrSource(e.target.value)}
                      placeholder="Örn. Bakara Suresi, 152. Ayet / Buhari"
                    />
                  </label>
                  {editType === 'esma' && (
                    <label>
                      Arapça Metin (Arabic - Esma için)
                      <input
                        value={trArabic}
                        onChange={(e) => setTrArabic(e.target.value)}
                        placeholder="Örn. الرَّحْمَنُ"
                      />
                    </label>
                  )}
                  {(editType === 'esma' || editType === 'dhikr') && (
                    <label>
                      Okunuşu (Transliteration)
                      <input
                        value={trTransliteration}
                        onChange={(e) => setTrTransliteration(e.target.value)}
                        placeholder="Örn. er-Rahmân"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className="composer" style={{ border: 0, padding: 0, marginTop: 12 }}>
                  <label>
                    Content Text (English)
                    <textarea
                      value={enContent}
                      onChange={(e) => setEnContent(e.target.value)}
                      rows={4}
                      placeholder="Enter content translation..."
                    />
                  </label>
                  <label>
                    Source (English - Optional)
                    <input
                      value={enSource}
                      onChange={(e) => setEnSource(e.target.value)}
                      placeholder="e.g. Surah Al-Baqarah, 152 / Bukhari"
                    />
                  </label>
                  {editType === 'esma' && (
                    <label>
                      Arabic Text (Arabic Script)
                      <input
                        value={enArabic}
                        onChange={(e) => setEnArabic(e.target.value)}
                        placeholder="e.g. الرَّحْمَنُ"
                      />
                    </label>
                  )}
                  {(editType === 'esma' || editType === 'dhikr') && (
                    <label>
                      Transliteration / Pronunciation
                      <input
                        value={enTransliteration}
                        onChange={(e) => setEnTransliteration(e.target.value)}
                        placeholder="e.g. ar-Rahman"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="editor-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowEditor(false)}
                disabled={loading}
              >
                İptal
              </button>
              <button type="submit" disabled={loading}>
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Duplicates Modal */}
      {showDuplicates && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="section-title">
              <h2>Tekrar Eden Kayıtlar</h2>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDuplicates(false)}
                style={{ minHeight: '32px', height: '32px', padding: '0 12px' }}
              >
                Kapat
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#6c8378', margin: '0 0 12px 0' }}>
              Aşağıdaki içerikler veritabanında birden fazla kez kayıtlıdır. Eski olanı koruyup mükerrer olanları "Sil" butonuna tıklayarak silebilirsiniz.
            </p>

            <div style={{ display: 'grid', gap: '16px', overflowY: 'auto', maxHeight: '60vh', paddingRight: '8px' }}>
              {duplicateGroups.map((group, i) => (
                <div key={i} style={{ border: '1px solid #d8e2dd', borderRadius: '8px', padding: '12px', background: '#fcfdfe' }}>
                  <div style={{ marginBottom: '8px', fontWeight: 600 }}>"{group.content_text}"</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#a12a2a', fontWeight: 'bold' }}>
                      Tekrar Sayısı: {group.count}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {group.ids.map((id: string, idx: number) => (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#f1f5f3', padding: '4px 8px', borderRadius: '4px' }}>
                          <span>ID: {id.slice(0, 8)}... {idx === 0 ? '(Korunan - Eski)' : '(Kopyalanmış)'}</span>
                          {idx > 0 && (
                            <span
                              className="action-link danger"
                              onClick={() => deleteDuplicateItem(id)}
                              style={{ fontWeight: 'bold', marginLeft: '6px' }}
                            >
                              Sil
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {duplicateGroups.length === 0 && (
                <p style={{ textAlign: 'center', color: '#6c8378', padding: '24px' }}>
                  Harika! Veritabanında tekrar eden kayıt bulunamadı.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
