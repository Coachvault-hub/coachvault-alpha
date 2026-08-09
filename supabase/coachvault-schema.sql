-- CoachVault 3.8.0 initial organization / roadmap / native forms schema

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  email text,
  full_name text,
  role text not null default 'coach' check (role in ('director','admin','coach')),
  team_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  graduation_year integer,
  gender text,
  created_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  fields jsonb not null default '[]'::jsonb,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  phase text not null,
  item_type text not null check (item_type in ('Form','Document','Link','Task','Meeting')),
  due_text text,
  due_at timestamptz,
  audience text,
  required boolean not null default false,
  resource_url text,
  form_id uuid references public.forms(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  form_id uuid not null references public.forms(id) on delete cascade,
  roadmap_item_id uuid references public.roadmap_items(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create table if not exists public.roadmap_completions (
  id uuid primary key default gen_random_uuid(),
  roadmap_item_id uuid not null references public.roadmap_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(roadmap_item_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.forms enable row level security;
alter table public.roadmap_items enable row level security;
alter table public.form_submissions enable row level security;
alter table public.roadmap_completions enable row level security;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create policy "profiles same organization read"
on public.profiles for select
using (organization_id = public.current_org_id() or id = auth.uid());

create policy "profiles own update"
on public.profiles for update
using (id = auth.uid());

create policy "organization members read organization"
on public.organizations for select
using (id = public.current_org_id());

create policy "organization members read teams"
on public.teams for select
using (organization_id = public.current_org_id());

create policy "directors manage teams"
on public.teams for all
using (
  organization_id = public.current_org_id()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('director','admin'))
)
with check (
  organization_id = public.current_org_id()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('director','admin'))
);

create policy "organization members read forms"
on public.forms for select
using (organization_id = public.current_org_id());

create policy "directors manage forms"
on public.forms for all
using (
  organization_id = public.current_org_id()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('director','admin'))
)
with check (
  organization_id = public.current_org_id()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('director','admin'))
);

create policy "organization members read roadmap"
on public.roadmap_items for select
using (organization_id = public.current_org_id());

create policy "directors manage roadmap"
on public.roadmap_items for all
using (
  organization_id = public.current_org_id()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('director','admin'))
)
with check (
  organization_id = public.current_org_id()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('director','admin'))
);

create policy "members submit forms"
on public.form_submissions for insert
with check (
  organization_id = public.current_org_id()
  and submitted_by = auth.uid()
);

create policy "directors read all submissions"
on public.form_submissions for select
using (
  organization_id = public.current_org_id()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('director','admin'))
);

create policy "members read own submissions"
on public.form_submissions for select
using (submitted_by = auth.uid());

create policy "members manage own completion"
on public.roadmap_completions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
