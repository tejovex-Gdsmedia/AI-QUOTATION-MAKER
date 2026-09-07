# AI Proposal & Quotation SaaS Platform

An enterprise-grade, multi-company SaaS platform designed for B2B service-based businesses (e.g. AI Automation Agencies, Software Development Companies, IT Consulting, Real Estate, Healthcare, etc.) to generate structured, professional AI-driven business proposals, manually override sections, track revision histories, and export high-quality, print-ready ReportLab PDFs.

---

## 🚀 Key Features

1. **Secure Authentication & Session Isolation:** Built on Supabase Auth. Private layouts and route guards prevent unauthorized data access.
2. **Dynamic Dashboard Analytics:** Calculates total proposals, accepted deals, potential pipeline revenues, and segments quotations by plans or creation timeline using clean SVG visualizations.
3. **Clients CRM Directory:** Registers, edits, filters, and deletes account records linked to quote master structures.
4. **Company Branding Panel:** Customizes dynamic brand colors (applied on-the-fly using CSS variables), logos, currency symbols, footers, terms, and labor rate profiles.
5. **AI Proposal Generator & ROI Calculator:** HTML5 sliders dynamically calculate monthly labor savings and ROI percentages, used to populate custom AI prompts generated via Google Gemini.
6. **Paragraph Override Editor:** Supports manual, inline text overrides for every generated proposal block (Executive Summary, Pain Points, Scope, pricing packages, terms, etc.) prior to export.
7. **Version History Control:** Automatically tracks revisions, allowing you to restore past proposals or ROI configurations.
8. **Professional PDF compiler:** Generates custom-branded ReportLab PDF compilations complete with indexes, timeline tables, pricing matrices, page number decorators ("Page X of Y"), and signature blocks.

---

## 🛠 Tech Stack

- **Frontend:** React, Vite, Lucide icons, React Router DOM, and custom variables based Vanilla CSS (Tailwind free).
- **Backend:** Python Flask API, psycopg2 connection pooler, and ReportLab PDF engine.
- **AI Core:** Google Gemini SDK (`google-genai` with JSON schema enforcement constraints).
- **Database & Auth:** Supabase PostgreSQL and Supabase JS auth client.

---

## ⚙ Local Setup & Execution

### 1. Prerequisite Installations
Ensure that **Node.js (v18+)** and **Python (v3.9+)** are installed on your local machine.

### 2. Run Local Setup Automation
We provide a setup script for Windows. Execute the following command in your terminal to bootstrap configuration files and install all dependencies:
```powershell
./setup_local.ps1
```

### 3. Database Migration Setup
Copy the PostgreSQL commands inside [supabase/schema.sql](file:///c:/Users/hp/OneDrive/Desktop/ai%20quotation%20maker/supabase/schema.sql) and execute them in your **Supabase Project SQL Editor**. For complete step-by-step guidance, refer to the [database_setup.md](file:///C:/Users/hp/.gemini/antigravity-ide/brain/93839454-0a23-4a12-b464-348ac90c6fc7/database_setup.md) artifact.

### 4. Running Dev Servers
- **Flask API Backend (`http://localhost:5000`):**
  ```bash
  cd backend
  python app.py
  ```
- **React Frontend (`http://localhost:5173`):**
  ```bash
  cd frontend
  npm run dev
  ```

---

## 🌍 Production Deployments

For complete walkthrough instructions on migrating schemas, hosting the React client on **Vercel**, and deploying the Flask API service on **Render**, refer to the [DEPLOYMENT.md](file:///c:/Users/hp/OneDrive/Desktop/ai%20quotation%20maker/DEPLOYMENT.md) playbook.

---

## 🔐 Security

### Environment Variables

All credentials are loaded from `.env` files that are **gitignored** and must never be committed.
Copy the appropriate example file and fill in your real values:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

| Variable | Location | Notes |
|---|---|---|
| `FLASK_SECRET_KEY` | `backend/.env` | Server-side only. Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GEMINI_API_KEY` | `backend/.env` | Server-side only. Get from [Google AI Studio](https://aistudio.google.com/app/apikey). Leave blank for mock fallback. |
| `DATABASE_URL` | `backend/.env` | Server-side only. Full Supabase PostgreSQL connection string including password. |
| `SUPABASE_URL` | `backend/.env` | Server-side only. Used for Supabase Admin user deletion API. |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | Server-side only. Never expose to frontend. |
| `FRONTEND_URL` | `backend/.env` | Server-side only. Allowed CORS origin (e.g. `https://your-frontend.vercel.app`). |
| `VITE_SUPABASE_URL` | `frontend/.env` | Safe to expose client-side (public project URL). |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | Safe client-side **only because RLS is enforced on every table**. This is a publishable key — never put the service role key here. |
| `VITE_API_URL` | `frontend/.env` | Public backend API endpoint URL. |

### ⚠ CRITICAL: Rotate All Secrets Before Production

If any sensitive credentials or passwords were previously used or stored locally during development, **rotate them immediately before production deployment**:

1. **Supabase Database Password**: In Supabase Dashboard → Project Settings → Database → Reset database password.
2. **Supabase Service Role Key**: If ever shared or exposed, roll it in Project Settings → API.
3. **Google Gemini API Key**: In [Google AI Studio](https://aistudio.google.com/app/apikey), generate a new restricted key if needed.
4. **Flask Secret Key**: Generate a new 256-bit entropy token using `secrets.token_hex(32)`.

### Row Level Security (RLS) Confirmation

Row Level Security (RLS) is enabled on all tables (`company_settings`, `clients`, `quotations`, `quotation_versions`, `activities`) and Supabase Storage bucket (`quotations`). Every policy strictly isolates records by `auth.uid()`. The Supabase service role key is strictly confined to server-side admin endpoints and is never referenced or exposed in frontend code.

