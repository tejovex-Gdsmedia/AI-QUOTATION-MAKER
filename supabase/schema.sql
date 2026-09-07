-- Supabase Database Schema Initialization for AI Proposal & Quotation SaaS
-- Copy and paste this into the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Company Settings Table (One profile per company/user)
create table if not exists company_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  company_name text not null,
  brand_name text not null,
  address text,
  gst_number text,
  website text,
  email text,
  phone text,
  logo_url text,
  currency text default 'INR',
  brand_colors jsonb default '{"primary": "#3b82f6", "secondary": "#1e293b", "background": "#f8fafc"}'::jsonb,
  default_packages jsonb default '{
    "Starter": {"price": "₹15,000", "features": ["Basic Automation", "1 Integration"], "timeline": "2 Weeks"},
    "Growth": {"price": "₹35,000", "features": ["Advanced AI Automation", "3 Integrations", "Chatbot Setup"], "timeline": "4 Weeks"},
    "Enterprise": {"price": "Custom", "features": ["Custom Integration", "Unlimited Workflows", "Dedicated Support"], "timeline": "6-8 Weeks"}
  }'::jsonb,
  monthly_maintenance_cost numeric default 5000.00,
  api_cost_rules jsonb default '{"token_pricing": "Standard", "included_tokens": 100000}'::jsonb,
  default_terms text default '1. 50% advance, 50% post-delivery. 2. Implementation timelines depend on client feedback speed. 3. System support is active for 30 days post-launch.',
  proposal_footer text default 'Prepared electronically by our AI Proposal engine.',
  digital_signature text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Client Management Table
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  company_name text not null,
  email text not null,
  phone text,
  address text,
  industry text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Quotations Master Table
create table if not exists quotations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  quotation_number text not null unique,
  proposal_title text not null,
  industry text not null,
  requirements text,
  pain_points text,
  prompt_template text,
  status text default 'Draft' check (status in ('Draft', 'Generated', 'Sent', 'Viewed', 'Negotiation', 'Accepted', 'Rejected', 'Expired')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Quotation Versions Table
create table if not exists quotation_versions (
  id uuid default gen_random_uuid() primary key,
  quotation_id uuid references quotations(id) on delete cascade,
  version_number integer not null,
  proposal_data jsonb not null,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Activities Logger Table
create table if not exists activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  quotation_id uuid references quotations(id) on delete set null,
  action text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) policies activation
alter table company_settings enable row level security;
alter table clients enable row level security;
alter table quotations enable row level security;
alter table quotation_versions enable row level security;
alter table activities enable row level security;

-- Setup granular Row Level Security (RLS) policies (Users can read and write only their own records)
-- Company Settings
create policy "CS user isolation select" on company_settings for select using (auth.uid() = user_id);
create policy "CS user isolation insert" on company_settings for insert with check (auth.uid() = user_id);
create policy "CS user isolation update" on company_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "CS user isolation delete" on company_settings for delete using (auth.uid() = user_id);

-- Clients
create policy "Clients user isolation select" on clients for select using (auth.uid() = user_id);
create policy "Clients user isolation insert" on clients for insert with check (auth.uid() = user_id);
create policy "Clients user isolation update" on clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Clients user isolation delete" on clients for delete using (auth.uid() = user_id);

-- Quotations
create policy "Quotations user isolation select" on quotations for select using (auth.uid() = user_id);
create policy "Quotations user isolation insert" on quotations for insert with check (auth.uid() = user_id);
create policy "Quotations user isolation update" on quotations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Quotations user isolation delete" on quotations for delete using (auth.uid() = user_id);

-- Quotation Versions
create policy "QV user isolation select" on quotation_versions for select using (auth.uid() = created_by);
create policy "QV user isolation insert" on quotation_versions for insert with check (auth.uid() = created_by);
create policy "QV user isolation update" on quotation_versions for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "QV user isolation delete" on quotation_versions for delete using (auth.uid() = created_by);

-- Activities
create policy "Activities user isolation select" on activities for select using (auth.uid() = user_id);
create policy "Activities user isolation insert" on activities for insert with check (auth.uid() = user_id);
create policy "Activities user isolation update" on activities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Activities user isolation delete" on activities for delete using (auth.uid() = user_id);


-- 6. Supabase Storage — Quotation PDFs
-- Run this AFTER enabling the Storage extension in your Supabase project.
-- Creates a private bucket; files are only accessible via signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quotations',
  'quotations',
  false,
  10485760,  -- 10 MB max per PDF
  array['application/pdf']
)
on conflict (id) do nothing;

-- Each authenticated user can only upload into their own sub-folder (user_id/)
create policy "Quotation PDF upload — own folder only" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'quotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Each user can read/sign only their own PDFs
create policy "Quotation PDF read — own folder only" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'quotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Each user can overwrite/upsert their own PDFs
create policy "Quotation PDF update — own folder only" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'quotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Each user can delete their own PDFs
create policy "Quotation PDF delete — own folder only" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'quotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. Performance Optimization Indexes
create index if not exists idx_clients_user_id on clients(user_id);
create index if not exists idx_quotations_user_id on quotations(user_id);
create index if not exists idx_quotations_client_id on quotations(client_id);
create index if not exists idx_quotation_versions_quotation_id on quotation_versions(quotation_id);
create index if not exists idx_quotation_versions_created_by on quotation_versions(created_by);
create index if not exists idx_activities_user_id on activities(user_id);
create index if not exists idx_activities_quotation_id on activities(quotation_id);

