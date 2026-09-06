# Production Deployment Playbook

This document provides step-by-step instructions for deploying the AI Proposal & Quotation SaaS Platform to production environments.

---

## 1. Database Setup (Supabase)

1. **Create Project:**
   - Sign up/log in to [Supabase](https://supabase.com).
   - Click **New Project** and name it (e.g., `ai-quotation-maker`). Keep note of your database password.
2. **Execute Database Migrations:**
   - Open the **SQL Editor** tab from your project dashboard.
   - Copy the SQL statements from [supabase/schema.sql](file:///c:/Users/hp/OneDrive/Desktop/ai%20quotation%20maker/supabase/schema.sql) and paste them into the editor.
   - Run the query. It will create the database tables (`company_settings`, `clients`, `quotations`, `quotation_versions`, `activities`), generate indexes, and activate Row Level Security (RLS) policies.
3. **Verify API Credentials:**
   - Navigate to **Project Settings -> API**.
   - Copy the **Project URL** and the **anon public key**. Save these for frontend configuration.
4. **Copy Database Connection String:**
   - Navigate to **Project Settings -> Database**.
   - Under **Connection string**, click **URI** and copy it (e.g., `postgresql://postgres.[project-id]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres`). Remember to replace `[password]` with your database password. Save this for backend configuration.

---

## 2. Backend Deployment (Render / Heroku)

Deploy the Flask API backend. Render is recommended for quick deployment.

1. **Prepare GitHub Repository:**
   - Commit the codebase to a private/public GitHub repository.
2. **Create Web Service on Render:**
   - Log in to [Render](https://render.com).
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository.
   - Set the following configurations:
     - **Name:** `ai-proposal-backend`
     - **Runtime:** `Python`
     - **Build Command:** `pip install -r requirements.txt` (or if using Render Python environment, it executes automatically)
     - **Start Command:** `gunicorn app:app` (ensure `gunicorn` is added to python dependencies if running in production)
3. **Configure Environment Variables:**
   - Navigate to the **Environment** tab in Render Web Service and add:
     - `DATABASE_URL`: *Your Supabase PostgreSQL URI (from Step 1.4)*
     - `GEMINI_API_KEY`: *Your Google Gemini API Key*
     - `FLASK_SECRET_KEY`: *Generate a long random secure string*
     - `FLASK_DEBUG`: `False`
     - `PORT`: `5000`
4. **Deploy:**
   - Click **Deploy Web Service** and wait for the build to pass.
   - Copy the service URL (e.g., `https://ai-proposal-backend.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

Deploy the single-page React-Vite application.

1. **Connect Project to Vercel:**
   - Log in to [Vercel](https://vercel.com).
   - Click **Add New -> Project**.
   - Import your GitHub repository.
2. **Configure Root Directory and Framework Presets:**
   - Select the root folder or set the **Root Directory** to `frontend`.
   - Vercel automatically detects **Vite** as the framework template and sets:
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
3. **Configure Environment Variables:**
   - Expand the **Environment Variables** section and input:
     - `VITE_SUPABASE_URL`: *Your Supabase Project URL*
     - `VITE_SUPABASE_ANON_KEY`: *Your Supabase Anon Key*
     - `VITE_API_URL`: `https://your-backend-render-domain.onrender.com/api` *(The URL copied from Step 2.4)*
4. **Deploy:**
   - Click **Deploy**.
   - Once deployment completes, Vercel will assign a production domain name (e.g., `https://ai-quotation-maker.vercel.app`).
