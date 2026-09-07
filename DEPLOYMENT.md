# Vercel Production Deployment Playbook

This document provides complete, step-by-step instructions for deploying the **AI Quotation Maker SaaS Platform** directly to **Vercel** as a unified single-project deployment (React 19 / Vite SPA Frontend + Python Serverless Flask Backend API).

---

## Architecture on Vercel

```mermaid
graph TD
    User([User Browser]) -->|HTTPS| VercelRouter[Vercel Global Edge Network]
    VercelRouter -->|SPA Routes /dashboard, /quotations, etc.| StaticFrontend[React / Vite Static Dist]
    VercelRouter -->|API Routes /api/*| PythonServerless[Vercel Serverless Function: api/index.py]
    PythonServerless -->|Google Gemini API| GeminiAI[Google AI Studio]
    PythonServerless -->|PostgreSQL TLS / Port 6543| SupabaseDB[(Supabase PostgreSQL)]
    StaticFrontend -->|Auth & Direct RLS Queries| SupabaseAuth[Supabase Auth & Storage]
```

- **Single Domain / Same-Origin**: Both frontend SPA and backend API endpoints are served from the same Vercel production URL (e.g., `https://your-project.vercel.app`), completely eliminating cross-origin CORS latency and issues.
- **Routing**: [vercel.json](file:///c:/Users/hp/OneDrive/Desktop/ai%20quotation%20maker/vercel.json) routes `/api/*` to the Python Serverless function `api/index.py` and all other web paths to `index.html` for client-side routing (`react-router-dom`).

---

## 1. Prerequisites: Supabase Database Setup

1. **Create Supabase Project:**
   - Log in to [Supabase](https://supabase.com) and click **New Project**.
   - Note your database password and project region.
2. **Run SQL Schema Migration:**
   - Go to **SQL Editor** in your Supabase dashboard.
   - Copy the entire SQL content from [supabase/schema.sql](file:///c:/Users/hp/OneDrive/Desktop/ai%20quotation%20maker/supabase/schema.sql) and paste it into the editor.
   - Click **Run**. This creates all tables (`company_settings`, `clients`, `quotations`, `quotation_versions`, `activities`), indexes, and enables Row Level Security (RLS) policies.
3. **Collect API & Connection Keys:**
   - Go to **Project Settings → API**:
     - `Project URL` (e.g., `https://xxxx.supabase.co`)
     - `anon / public` key
     - `service_role` secret key (Keep secret!)
   - Go to **Project Settings → Database → Connection string → URI**:
     - Copy the **Session / Transaction Pooler (port 6543)** URI (e.g., `postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`).

---

## 2. Deploy to Vercel (Step-by-Step UI Guide)

1. **Import Repository in Vercel:**
   - Go to your [Vercel Dashboard](https://vercel.com/dashboard).
   - Click **Add New...** → **Project**.
   - Select the GitHub repository: `https://github.com/tejovex-Gdsmedia/AI-QUOTATION-MAKER.git` (or search for `AI-QUOTATION-MAKER`).
2. **Configure Project Settings:**
   - **Framework Preset**: Leave as **Other** (or Vite).
   - **Root Directory**: `./` (leave at root — [vercel.json](file:///c:/Users/hp/OneDrive/Desktop/ai%20quotation%20maker/vercel.json) handles building the frontend from `frontend/` and mapping the Python API automatically).
   - **Build & Development Settings**: Keep defaults (overridden automatically by `vercel.json`).
3. **Configure Environment Variables in Vercel:**
   In the **Environment Variables** section, add the following keys for **Production, Preview, and Development**:

   | Variable Name | Safe for Client? | Value / Description |
   | :--- | :---: | :--- |
   | `VITE_SUPABASE_URL` | **Yes** (Client) | Your Supabase Project URL (`https://your-project.supabase.co`) |
   | `VITE_SUPABASE_ANON_KEY` | **Yes** (Client) | Your Supabase Anon Public Key (RLS-protected) |
   | `DATABASE_URL` | **No** (Server Only) | Supabase PostgreSQL Connection URI (Pooler port 6543) |
   | `GEMINI_API_KEY` | **No** (Server Only) | Google AI Studio API Key from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
   | `SUPABASE_URL` | **No** (Server Only) | Your Supabase Project URL (`https://your-project.supabase.co`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | **No** (Server Only) | Your Supabase Service Role Secret Key (for Admin deletion endpoint) |
   | `FLASK_SECRET_KEY` | **No** (Server Only) | 64-char random hex string generated with `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `FLASK_DEBUG` | **No** (Server Only) | `False` |

4. **Click Deploy:**
   - Click **Deploy**. Vercel will install dependencies from [requirements.txt](file:///c:/Users/hp/OneDrive/Desktop/ai%20quotation%20maker/requirements.txt), compile the React 19 frontend bundle, and deploy the serverless Python API.
   - Once deployment succeeds, Vercel will provide your live production domain (e.g., `https://ai-quotation-maker.vercel.app`).

---

## 3. Post-Deployment Verification Checklist

- [ ] Visit `https://<your-app>.vercel.app/` — homepage/auth loads with sleek modern styling.
- [ ] Visit `https://<your-app>.vercel.app/api/health` — returns `{"status":"healthy","service":"AI Proposal API","database":"connected"}`.
- [ ] Sign up / Sign in with Supabase Auth.
- [ ] Fill out Company Profile in Settings and save.
- [ ] Generate an AI Proposal on `/quotations/new` — verify Gemini AI generation and ReportLab PDF export function properly.
- [ ] Verify Row Level Security — data created by one user is never visible to another.
