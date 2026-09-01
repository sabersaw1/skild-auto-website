-- Skild Auto — Reviews sync + Gallery/Projects
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.
-- Does NOT touch quotes, customers, vehicles, appointments or settings.

-- =========================================================================
-- GOOGLE REVIEWS (cache of real Google Business Profile reviews)
-- =========================================================================
create table if not exists public.google_reviews (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'google',
  google_review_id text not null,
  location_id text,
  reviewer_name text,
  reviewer_photo_url text,
  rating smallint check (rating between 1 and 5),
  comment text,
  review_created_at timestamptz,
  review_updated_at timestamptz,
  is_visible boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (source, google_review_id)
);
create index if not exists google_reviews_created_idx
  on public.google_reviews (review_created_at desc);

grant select on public.google_reviews to anon, authenticated;
grant all on public.google_reviews to service_role;
alter table public.google_reviews enable row level security;

drop policy if exists "public read visible reviews" on public.google_reviews;
create policy "public read visible reviews" on public.google_reviews
  for select to anon, authenticated using (is_visible);

drop policy if exists "admin/staff manage reviews" on public.google_reviews;
create policy "admin/staff manage reviews" on public.google_reviews
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

-- =========================================================================
-- PROJECTS (gallery)
-- =========================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  vehicle_kind public.vehicle_kind not null default 'auto',
  vehicle_year int,
  vehicle_make text,
  vehicle_model text,
  service_category text,
  problem text,
  work_performed text,
  result text,
  parts_used text,
  notes text,
  description text,
  project_date date,
  is_published boolean not null default false,
  -- Optional links into the existing business records (never required).
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_published_idx
  on public.projects (is_published, project_date desc);

grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;

drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects" on public.projects
  for select to anon using (is_published);

drop policy if exists "admin/staff manage projects" on public.projects;
create policy "admin/staff manage projects" on public.projects
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

-- =========================================================================
-- PROJECT PHOTOS
-- =========================================================================
create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_type text not null default 'additional'
    check (image_type in ('before','after','additional')),
  sort_order int not null default 0,
  caption text,
  alt_text text,
  -- Storage-agnostic reference (currently Cloudinary).
  provider text not null default 'cloudinary',
  storage_ref text,
  url text not null,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists project_photos_project_idx
  on public.project_photos (project_id, image_type, sort_order);

grant select on public.project_photos to anon, authenticated;
grant insert, update, delete on public.project_photos to authenticated;
grant all on public.project_photos to service_role;
alter table public.project_photos enable row level security;

drop policy if exists "public read published project photos" on public.project_photos;
create policy "public read published project photos" on public.project_photos
  for select to anon using (
    exists (select 1 from public.projects p
            where p.id = project_id and p.is_published)
  );

drop policy if exists "admin/staff manage project photos" on public.project_photos;
create policy "admin/staff manage project photos" on public.project_photos
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

-- ----------------------------------------------------------------------------
-- Hardening (2026-09-01 audit): internal project notes must never be readable
-- by anonymous visitors, even though row-level access is limited to published
-- projects. Column-level grants close that gap. Run once; safe to re-run.
-- ----------------------------------------------------------------------------
revoke select on public.projects from anon;
grant select (
  id, slug, title, vehicle_kind, vehicle_year, vehicle_make, vehicle_model,
  service_category, problem, work_performed, result, parts_used, description,
  project_date, is_published, created_at, updated_at
) on public.projects to anon;
