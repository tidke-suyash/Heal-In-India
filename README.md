# 🌿 Heal in India — Integrated Healthcare & Medical-Wellness Tourism Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![Status](https://img.shields.io/badge/Status-Demo--Ready%20MVP-brightgreen.svg)](#)

> An integrated healthcare and medical-wellness tourism web platform connecting Indian patients and international medical tourists with verified **Ayurveda**, **Panchakarma**, and **modern medical centers**.

---

## 🌟 Key Highlights & Features

### 1. 🔍 Verified Clinic & Hospital Directory
- **Manual Verification & AYUSH/NABH Alignment**: Multi-tier vetting of clinics, hospitals, and practitioners with accreditation badges.
- **Multi-Attribute Search & Filter**: Filter by treatment type (*Ayurveda, Panchakarma, Wellness Retreat, Integrated Care, Modern Medicine*), destination city (*Kochi, Rishikesh, Goa, Jaipur, Mumbai, Bengaluru, Delhi*), consultation fee, and patient ratings.
- **Detailed Clinic Profiles**: Detailed pages featuring doctor credentials, specialties, treatment packages, verified patient reviews, and clinic contact information.

### 2. 📅 Multi-Day Therapy & Package Booking
- **Curated Programs**: 7-Day Panchakarma Detox, 14-Day Rasayana Rejuvenation, 10-Day Beach Wellness, and Modern Executive Health Checkups.
- **Day-by-Day Protocol Breakdown**: Pre-cleansing (*Purvakarma*), Core cleansing (*Pradhanakarma*), and Post-cleansing rejuvenation (*Paschatkarma*).
- **Interactive Booking Flow**: Date range picker, guest selection, confidential medical history intake, and instant booking vouchers.

### 3. 🛂 Medical Tourism & Ayush Visa Hub
- **Ayush Visa (AY-1 / AY-2) Guidance**: Complete step-by-step guidance for international patients travelling to India.
- **Interactive Eligibility Checklist**: Verifies passport validity, hospital invitation status, flight proof, and health documentation.
- **Visa Support Letter Generator**: Allows patients to request official signed clinic invitation letters.
- **Global Cost Comparison Matrix**: Highlights 70% to 85% savings in India compared to equivalent treatments in the US, UK, and Europe.

### 4. 📁 Unified Patient Health Record (PHR)
- **Multi-System Records**: Consolidates Ayurvedic Prakriti assessments, diagnostic lab panels, MRI imaging, and doctor prescriptions.
- **Granular Privacy Controls**: One-click sharing with attending clinics, revoke access at any time.
- **Temporary Doctor Access Pass**: Generates 24-hour secure 6-digit access codes (`841-920`) for in-person consultations.

### 5. 🤖 AI Health Navigator (Powered by Gemini)
- Responsive conversational widget to help users navigate treatment categories, explore Ayurvedic terminology (*Doshas, Abhyanga, Shirodhara*), and find relevant cities.
- Embedded medical safety disclaimers and emergency triaging protocols.

### 6. 🎭 Role-Adaptive Portal & 1-Click Demo Switcher
Switch between personas directly from the navigation bar without signing out:
- **Patient**: Priya Sharma (*Mumbai, India*) — View confirmed Panchakarma bookings and health records.
- **International Medical Tourist**: James Anderson (*New York, USA*) — Manage Ayush Visa letters and international concierge.
- **Clinic Provider**: Kerala Ayurveda Heritage Centre (*Kochi, Kerala*) — Manage incoming bookings and patient intake.
- **Platform Admin**: Admin Kumar (*Delhi, India*) — Platform analytics, revenue GMV, and clinic verification queue.

---

## 🏗️ Technology Architecture

- **Backend**: Node.js & Express.js
- **Security**: Helmet, CORS, Express-Rate-Limit, Express-Validator, Audit logging
- **Database & Storage**: PostgreSQL schema with Row-Level Security (RLS) policies ([`db/schema.sql`](file:///db/schema.sql), [`db/rls-policies.sql`](file:///db/rls-policies.sql), [`db/seed.sql`](file:///db/seed.sql))
- **Frontend**: Clean Vanilla JavaScript & Modular Design System CSS ([`public/css/styles.css`](file:///public/css/styles.css))
- **Demo Mode**: Built-in in-memory fallback datasets ([`server/data/mockData.js`](file:///server/data/mockData.js)) allowing 100% functionality without requiring external credentials.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js (>= 18.0.0)
- npm (>= 9.0.0)

### 1. Clone & Install
```bash
git clone https://github.com/tidke-suyash/Heal-In-India.git
cd Heal-In-India
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*Note: `DEMO_MODE=true` is enabled by default so all features work immediately out of the box.*

### 3. Start the Server
```bash
npm start
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📄 Application Pages Overview

| Page | URL Path | Description |
|---|---|---|
| **Landing Page** | `/` (`index.html`) | Hero search, categories, featured clinics, packages, trust signals |
| **Find Clinics** | `/clinics.html` | Search, multi-category filters, price slider, clinic cards |
| **Clinic Details** | `/clinic-details.html?slug=...` | Accreditation badges, package list, doctors roster, patient reviews |
| **Treatments & Packages** | `/treatments.html` | Multi-day programs, individual classical therapies, Panchakarma protocol guide |
| **Booking Flow** | `/booking.html` | Dates, guests, health notes, concierge add-ons, voucher generation |
| **Medical Tourism & Visa** | `/travel-visa.html` | Ayush Visa checklist, cost comparison, support letter request form |
| **Health Records** | `/records.html` | Unified PHR, category filtering, document upload modal, doctor access pass |
| **Unified Dashboard** | `/dashboard.html` | Role-adaptive dashboard with 1-click live demo role switcher |
| **Authentication** | `/login.html` & `/signup.html` | Fast 1-click demo logins for all personas |
| **Compliance & Legal** | `/terms.html`, `/privacy.html`, `/medical-disclaimer.html` | Medical disclaimer, terms of service, privacy policy |

---

## ⚕️ Legal & Medical Disclaimer

Heal in India is an informational discovery and booking platform. It does not provide medical diagnosis, direct prescriptions, or medical advice. Consult qualified healthcare professionals before undergoing treatments. Visa issuance is under the sole discretion of the Government of India.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
