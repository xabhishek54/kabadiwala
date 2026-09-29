# ♻️ Kabadiwala Connect

> **Smart India Hackathon (SIH) 2024 — E-Waste & Critical Minerals Recovery**  
> A mobile-first PWA that bridges informal scrap collectors (kabadiwalas) with authorized e-waste recyclers, enabling transparent price discovery, tamper-evident digital handovers, and EPR-compliant traceability.

---

## 🎯 Problem Statement

India's informal scrap collectors handle the vast majority of end-of-life electronics, yet remain **outside** the formal Extended Producer Responsibility (EPR) recycling chain under the E-Waste (Management) Rules, 2022.

Collectors face:
- 🔴 No visibility into fair/prevailing prices for materials
- 🔴 No way to find authorized recyclers nearby
- 🔴 No mechanism to generate tamper-evident, documented handovers
- 🔴 No incentive to prefer formal recycling over backyard processing (open burning, acid leaching)

This leads to critical-mineral loss (Li, Co, Nd, Ta, Ga, In) and serious health risks for collectors.

---

## 💡 Solution

**Kabadiwala Connect** is a **single installable PWA** — no app-store download needed — that delivers:

| Feature | Collector | Recycler/Admin |
|---|---|---|
| 📸 AI-powered material classification | ✅ | |
| 💰 Instant price estimate (explainable arithmetic) | ✅ | |
| 🗺️ Ranked nearby authorized recyclers | ✅ | |
| 📄 Digital handover (photo + GPS + QR/code) | ✅ | ✅ |
| 📒 Earnings ledger (cash + UPI intent) | ✅ | |
| 🔊 Audio/pictorial safety guidance (Hindi/Marathi) | ✅ | |
| 🌐 Offline-first (IndexedDB + service worker) | ✅ | |
| 📊 Price board with trend charts | ✅ | ✅ |
| 🔬 Critical Minerals Impact Dashboard | | ✅ |
| 🚨 Anomaly detection on transactions | | ✅ |
| 👥 Recycler management & authorization | | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            React PWA (Vite + TypeScript)     │
│  ┌──────────────┐  ┌───────────────────────┐│
│  │ Collector UI │  │  Recycler / Admin UI  ││
│  │ (icon-first) │  │  (dashboard/list)     ││
│  └──────┬───────┘  └───────────┬───────────┘│
│         │  TF.js (in-browser   │             │
│         │  ML classification)  │             │
│  ┌──────▼──────────────────────▼───────────┐│
│  │  Service Worker (Workbox) + Dexie/IndexedDB ││
│  └──────────────────┬───────────────────────┘│
└─────────────────────│───────────────────────┘
                      │ REST API (sync when online)
┌─────────────────────▼───────────────────────┐
│            FastAPI Backend                   │
│  Auth · Lots · Prices · Handover             │
│  Recycler Matching · Ledger · Anomaly ML     │
│  ┌───────────────────────────────────────┐  │
│  │         SQLite / PostgreSQL           │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Tech Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| PWA / Offline | vite-plugin-pwa (Workbox), Dexie.js (IndexedDB) |
| ML (client) | TensorFlow.js — MobileNet-based image classifier |
| Charts | Recharts |
| i18n | i18next (English / Hindi / Marathi) |
| PDF/QR | jsPDF, qrcode.react, html5-qrcode |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn |
| Database | SQLite (dev) / PostgreSQL (production) |
| ML (server) | scikit-learn, pandas, NumPy |
| Mobile (optional) | Capacitor (Android APK generation) |
| Testing | Vitest + Testing Library (frontend), pytest + httpx (backend) |

---

## 📁 Project Structure

```
Kabadiwala/
├── frontend/                  # React PWA
│   ├── src/
│   │   ├── features/          # Page-level feature modules
│   │   │   ├── auth/          # Login, Onboarding, Collector onboarding
│   │   │   ├── home/          # Home / dashboard
│   │   │   ├── lotCreation/   # Photo + weight → digital lot
│   │   │   ├── lots/          # Lot listing & detail
│   │   │   ├── priceBoard/    # Price trends & charts
│   │   │   ├── recyclerMatch/ # Nearby recycler ranking
│   │   │   ├── recyclerMode/  # Recycler dashboard & rates
│   │   │   ├── handover/      # Digital handover record & QR
│   │   │   ├── ledger/        # Earnings ledger
│   │   │   ├── safety/        # Pictorial/audio safety guidance
│   │   │   ├── minerals/      # Critical minerals impact dashboard
│   │   │   ├── profile/       # Collector profile
│   │   │   ├── verify/        # Handover verification
│   │   │   └── admin/         # Anomaly detection dashboard
│   │   ├── components/        # Shared UI components
│   │   ├── data/
│   │   │   ├── local/         # Dexie DB schema & offline queries
│   │   │   └── remote/        # API client (axios-based)
│   │   ├── i18n/              # Translation strings
│   │   └── utils/             # ML classifier, geo utils, etc.
│   └── android/               # Capacitor Android project
│
└── backend/                   # FastAPI backend
    ├── app/
    │   ├── routers/           # auth, lots, prices, handover, recyclers, ledger, anomaly
    │   ├── models/            # SQLAlchemy ORM models
    │   ├── schemas/           # Pydantic request/response schemas
    │   └── ml/                # scikit-learn model training & inference
    ├── seed/                  # CSV seed data for recyclers & prices
    ├── scripts/               # Dataset generation & migration scripts
    └── tests/                 # pytest test suite
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- (Optional) PostgreSQL for production

### Frontend

```bash
cd frontend
npm install
npm run dev          # starts Vite dev server at http://localhost:5173
```

Run tests:
```bash
npm test
```

Build production PWA bundle:
```bash
npm run build
```

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server (SQLite by default for dev)
uvicorn app.main:app --reload --port 8000
```

Run tests:
```bash
pytest tests/
```

API docs available at: `http://localhost:8000/docs`

### Environment Variables

Create `backend/.env`:
```
DATABASE_URL=sqlite:///./kabadiwala.db   # or postgresql://user:pass@host/db
SECRET_KEY=your-secret-key
```

---

## 🤖 AI / ML Features

### 1. In-Browser Material Suggestion
- Deterministic image heuristic suggests supported e-waste categories and conditions
- Runs in-browser and works offline
- Category, subcategory, weight, and condition remain manually editable
- The TensorFlow.js model path is scaffolded, but the shipped model asset is currently a stub

### 2. Price Trend Prediction (scikit-learn)
- Linear regression on historical price-per-kg per category
- Confidence-weighted valuation: `category_avg_price × weight × condition_multiplier`
- Explainable breakdown shown to collector (not a black box)

### 3. Recycler Ranking
- Deterministic scoring: distance + authorization status + accepted materials + offered rate
- Designed to blend a learned re-ranker as real usage data accumulates

### 4. Anomaly Detection
- Statistical outlier detection on transaction values (price/weight ratio)
- Flags suspicious handovers for admin review

---

## 🌍 Offline-First Architecture

Kabadiwala Connect works **without internet** for all core collector flows:

- **Service Worker (Workbox)** caches the app shell, assets, and translations
- **IndexedDB (Dexie.js)** stores lots, handover drafts, price cache, and a **sync outbox queue**
- When connectivity returns, the outbox syncs automatically in the background
- No data loss on connectivity drops

---

## 📊 Datasets Produced

The platform continuously generates 5 structured datasets:

| Dataset | Description |
|---|---|
| **Material** | Category, condition, weight, photo per lot |
| **Price** | Per-material price observations (city, date, collector-reported) |
| **Recycler** | Authorization status, location, accepted materials, rates |
| **Transaction** | Handover records with collector, recycler, weight, amount |
| **Traceability** | Chain-of-custody from collector → recycler → (future) smelter |

---

## 🔒 Security & Privacy

- Phone-number based auth (OTP flow, no Aadhaar/KYC in prototype)
- Minimal collector profile — only what's needed for traceability
- GPS used only at point of handover (no continuous background tracking)
- JWT-based API auth
- Documented extension points for future KYC and government EPR portal integration

---

## 📱 PWA Installation

1. Open the app URL in **Chrome on Android**
2. Tap **"Add to Home Screen"** from the browser menu
3. The app icon appears on your home screen — full-screen, offline-capable, app-like

> iOS (Safari) has limited PWA support; Android Chrome is the primary target given the user base.

---

## 🤝 Differentiators vs. Existing Apps

Unlike doorstep-pickup startups (ScrapUncle, TheKabadiwala) that **replace** the informal collector with their own staff, **Kabadiwala Connect makes the existing kabadiwala the central user** — keeping their business, territory, and income intact while adding price transparency, verified-recycler access, and formal proof-of-transaction.

---

## 📄 Documentation

Detailed documentation is available in the project root:

| File | Contents |
|---|---|
| `01-project-overview.md` | Problem, solution, objectives, competitive landscape |
| `02-features-implementation.md` | Feature-by-feature spec |
| `03-technical-architecture.md` | System design, offline strategy, device constraints |
| `04-datasets-and-data-model.md` | Dataset schemas and ERD |
| `05-ml-ai-guide.md` | ML model details and training pipeline |
| `06-development-deployment.md` | Dev setup, CI, deployment guide |
| `07-ui-ux-guidelines.md` | Design system, accessibility, i18n |
| `08-field-research-and-interviews.md` | Primary research with collectors |
| `SIH_PROBLEM_STATEMENT_COMPLIANCE.md` | Mapping to SIH evaluation criteria |

---

## 🏆 SIH Problem Statement

**Domain:** E-Waste Management with Critical Mineral Recovery Focus  
**Ministry:** Ministry of Mines / JNARDDC  
**Hackathon:** Smart India Hackathon (SIH) 2024

---

## 📜 License

MIT
