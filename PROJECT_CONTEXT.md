# Project Context: Çağrı (The Message)

This document describes the core values, design decisions, feature scopes, and system architecture for **Çağrı (The Message)**.

---

## 1. Product Vision & Approach

Çağrı is an Islamic guide application designed to inspire hope, cultivate purpose, and foster sustainable spiritual practices. It stands in stark contrast to heavy, traditional, or transactional apps.

### Core Tone Guidelines
* **Inviting, Not Preachy**: The language is warm, soft, and gentle. It never scolds or judges the user.
* **Quiet presence**: It acts as a calm companion, keeping notifications light, readable, and non-intrusive.
* **Micro-Habits**: Prioritizes tiny, persistent moments of mindfulness (tefekkür, dhikr, brief prayers) rather than demanding massive lifestyle overhauls.

---

## 2. Visual Design System

The app utilizes a modern, aesthetic approach far removed from green-and-gold curlicues or heavy corporate branding:

* **Soft Color Palette**: 
  - *Light Mode*: Soft mint green (`#F4F7F6`), Deep Forest Sage (`#2A4B3D`), and accents of Warm Sand.
  - *Dark Mode*: Warm charcoal (`#1A1D1C`) paired with soft Jade Green (`#A0C4B6`) accents.
* **Typography**: Elegant, spacious layout utilizing clean modern sans-serif fonts, with traditional quotes set in classical serif faces for deep focus.
* **UI Elements**: High-contrast, rounded glassmorphism-style cards, smooth switches, and clear tap indicators.

---

## 3. MVP Scope

### Included Features
1. **Daily Messages**:
   - A single daily featured content block matching the user's category preferences (hope, purpose, worship, prayer, dhikr).
2. **Flexible Notifications**:
   - Customizable notification frequencies (Low: 1x, Medium: 3x, High: 5x a day).
   - "Silent Hours" / "Rahatsız Etme Saatleri" settings to block alerts during sleep (e.g. 22:00 - 06:00).
3. **Local Storage**:
   - Remembers user choice configurations natively.

### Out of Scope (For Future Phases)
* Artificial Intelligence / AWS Bedrock guidance.
* User Authentication, login, or social tracking.
* Payment systems, premium tiers, or ads.
* High-intensity UI animations.

---

## 4. MVP User Interface Screens

- **Onboarding Screen**: Welcomes the user with the core philosophy and a single clean trigger to begin.
- **Günün Mesajı (Daily Message)**: Displays a central text container showing a selected Verse/Hadith/Quote matching the user's configuration.
- **Manevi Odak (Category Preferences)**: Checkbox/switch settings to refine content interests.
- **Ayarlar (Settings)**: Notification frequency controls, Dark Mode switch, and silent interval definitions.
