# Next Actions (NEXT_ACTIONS.md)

This is the prioritized list of pending tasks and issues for **Çağrı (The Message)**. Select the next highest priority item to work on, formulate an implementation plan, and obtain approval before making changes.

---

## 🚨 Prioritized Bugs & Features (Immediate Focus)

These items are to be solved first, in a step-by-step manner.

| Issue ID | Task | Priority | Status | Notes |
|----------|------|----------|--------|-------|
| **MSG-152** | Anonim kullanıcıların saatlik push bildirimleri almama sorununu araştır ve düzelt | High | ✅ Done | Verify push token generation and local scheduling for guest (anonymous) users. |
| **MSG-153** | Anonim kullanıcılar için içerik kaydetme (bookmark) desteği ekle | High | ✅ Done | Allow non-logged-in users to bookmark content (Local storage fallback or Supabase schema adjustment). |
| **MSG-154** | Bugün nasıl hissediyorsun butonu tıklandıktan sonra tab geçişi veya emoji seçilince tekrar görünmeli | High | ✅ Done | Restore button state in `DailyScreen` upon navigation focus/tab switch or emoji interaction. |
| **MSG-155** | Ana ekranda tab'lar arası swipe (kaydırma) ile geçiş desteği ekle | High | ✅ Done | Implement swipe gesture-based tab navigation in the mobile app. |
| **MSG-156** | Ayarlar sayfasındaki Versiyon ekranı ikon ve i18n düzeltmeleri | High | ✅ Done | Fix icon visibility on the Version page; show "Çağrı" instead of "The Message" in Turkish locale. |
| **MSG-157** | Bildirim saatleri seçme kısmını dikey kaydırmalı (Wheel Picker / Slide) yap | High | ✅ Done | Replace simple text slider/inputs with a centered, vertical-sliding Wheel Picker (like iOS Alarm). |
| **MSG-158** | Bildirim saatleri dilimleri (Sabah, Kuşluk vb.) isimlendirmesini düzelt | High | ✅ Done | Propose and implement a label solution (e.g. "1. Bildirim", "2. Bildirim" or dynamic tags) to prevent logical time mismatches. |
| **MSG-159** | Ayarlar sayfasındaki Hesap Oluştur ekranından anonim kullanıcıların geri dönebilmesini sağla | High | ✅ Done | Add back button/gesture to allow guests to exit the Create Account flow without making a selection. |

---

## 📋 General Backlog

| Issue ID | Task | Priority | Status | Notes |
|----------|------|----------|--------|-------|
| **MSG-101** | Erişilebilirlik audit'i yap ve kontrast hedeflerini çıkar | Medium | 📋 Todo | Font scale, contrast, tap targets, and screen reader labels. |
| **MSG-102** | Büyük yazı ve yüksek kontrast modu ekle | Medium | 📋 Todo | Add accessibility controls to Settings. |
| **MSG-103** | Screen reader label ve navigation iyileştirmeleri yap | Medium | 📋 Todo | Add ARIA/a11y labels to icons, tab bar, modals, and date picker. |
| **MSG-92** | Navigation linking config ve route sözleşmesini oluştur | Medium | 📋 Todo | Necessary for deep linking routing mapping. |
| **MSG-93** | Notification response listener ile tap yönlendirmesi ekle | Medium | 📋 Todo | Route tapped notifications to the specific content card. |
| **MSG-96** | Günlük karttan özel not ekleme UI'ı tasarla | Low | 📋 Todo | User-supplied note on content cards. |
| **MSG-97** | Kaydedilenlerde notlu içerikleri göster | Low | 📋 Todo | Expand saved items list view. |
| **MSG-95** | Journal verisi için local/cloud saklama kararını ver | Low | 📋 Todo | Architectural decision on storage design. |
| **MSG-21** | Google Play Developer Account Setup + Android AAB Build | Medium | 📋 Todo | Provision Google Play console and create the Android release bundle (.aab). |
| **MSG-17** | Onboarding Wizard (2-step setup: topic selection + notification configuration) | Medium | 📋 Todo | Create a step-by-step onboarding screen for first-time users. |
| **MSG-8** | Google OAuth Improvements | Low-Medium | 📋 Todo | Refactor OAuth callback and edge cases. |
| **MSG-11** | Audio/article content type UI | Low | 📋 Todo | Present audio/articles if schema data is populated in the future. |
| **MSG-14** | Content library browse screen | Low | 📋 Todo | Allow users to browse historical or category-specific content cards. |
