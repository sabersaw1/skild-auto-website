-- Skild Auto OS — foundation schema
-- Run this once in the Supabase SQL editor for project srtpaqwlrtxtflcjbqie.
-- Idempotent: safe to re-run.

-- =========================================================================
-- ENUMS
-- =========================================================================
do $$ begin
  create type public.app_role as enum ('admin', 'staff', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vehicle_kind as enum ('auto', 'moto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quote_status as enum ('new', 'contacted', 'scheduled', 'completed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- CUSTOMERS
-- =========================================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text,
  email text unique,
  phone text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.customers to authenticated;
grant insert on public.customers to anon;
grant all on public.customers to service_role;
alter table public.customers enable row level security;

-- =========================================================================
-- VEHICLES
-- =========================================================================
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  kind public.vehicle_kind not null default 'auto',
  year int,
  make text,
  model text,
  mileage text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.vehicles to authenticated;
grant insert on public.vehicles to anon;
grant all on public.vehicles to service_role;
alter table public.vehicles enable row level security;

-- =========================================================================
-- QUOTES
-- =========================================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  requested_service text,
  description text,
  notes text,
  summary text,
  status public.quote_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quotes_created_at_idx on public.quotes (created_at desc);
create index if not exists quotes_status_idx on public.quotes (status);
grant select, insert, update on public.quotes to authenticated;
grant insert on public.quotes to anon;
grant all on public.quotes to service_role;
alter table public.quotes enable row level security;

-- =========================================================================
-- QUOTE PHOTOS
-- =========================================================================
create table if not exists public.quote_photos (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  url text not null,
  public_id text,
  format text,
  bytes int,
  original_filename text,
  created_at timestamptz not null default now()
);
grant select, insert on public.quote_photos to authenticated;
grant insert on public.quote_photos to anon;
grant all on public.quote_photos to service_role;
alter table public.quote_photos enable row level security;

-- =========================================================================
-- APPOINTMENTS
-- =========================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  location text,
  notes text,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists appointments_start_idx on public.appointments (start_at);
create index if not exists appointments_status_idx on public.appointments (status);
grant select, insert, update on public.appointments to authenticated;
grant insert on public.appointments to anon;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;

-- =========================================================================
-- BUSINESS HOURS
-- =========================================================================
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  open_time time not null,
  close_time time not null,
  is_open boolean not null default true,
  unique (weekday)
);
grant select on public.business_hours to anon, authenticated;
grant all on public.business_hours to service_role;
alter table public.business_hours enable row level security;

-- =========================================================================
-- BLOCKED TIMES
-- =========================================================================
create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists blocked_times_range_idx on public.blocked_times (start_at, end_at);
grant select on public.blocked_times to anon, authenticated;
grant all on public.blocked_times to service_role;
alter table public.blocked_times enable row level security;

-- =========================================================================
-- USER ROLES
-- =========================================================================
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- =========================================================================
-- POLICIES
-- =========================================================================
drop policy if exists "anon can insert customer" on public.customers;
create policy "anon can insert customer" on public.customers
  for insert to anon with check (true);
drop policy if exists "admin/staff can read customers" on public.customers;
create policy "admin/staff can read customers" on public.customers
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));
drop policy if exists "admin/staff can update customers" on public.customers;
create policy "admin/staff can update customers" on public.customers
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "anon can insert vehicle" on public.vehicles;
create policy "anon can insert vehicle" on public.vehicles
  for insert to anon with check (true);
drop policy if exists "admin/staff can read vehicles" on public.vehicles;
create policy "admin/staff can read vehicles" on public.vehicles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "anon can insert quote" on public.quotes;
create policy "anon can insert quote" on public.quotes
  for insert to anon with check (true);
drop policy if exists "admin/staff can read quotes" on public.quotes;
create policy "admin/staff can read quotes" on public.quotes
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));
drop policy if exists "admin/staff can update quotes" on public.quotes;
create policy "admin/staff can update quotes" on public.quotes
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "anon can insert quote photo" on public.quote_photos;
create policy "anon can insert quote photo" on public.quote_photos
  for insert to anon with check (true);
drop policy if exists "admin/staff can read quote photos" on public.quote_photos;
create policy "admin/staff can read quote photos" on public.quote_photos
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "anon can insert appointment" on public.appointments;
create policy "anon can insert appointment" on public.appointments
  for insert to anon with check (true);
drop policy if exists "admin/staff can read appointments" on public.appointments;
create policy "admin/staff can read appointments" on public.appointments
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));
drop policy if exists "admin/staff can update appointments" on public.appointments;
create policy "admin/staff can update appointments" on public.appointments
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "public read business hours" on public.business_hours;
create policy "public read business hours" on public.business_hours
  for select to anon, authenticated using (true);
drop policy if exists "public read blocked times" on public.blocked_times;
create policy "public read blocked times" on public.blocked_times
  for select to anon, authenticated using (true);

drop policy if exists "user can read own roles" on public.user_roles;
create policy "user can read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- =========================================================================
-- DEFAULT BUSINESS HOURS (Mon–Sat 8 AM – 8 PM local, closed Sunday)
-- =========================================================================
insert into public.business_hours (weekday, open_time, close_time, is_open) values
  (0, '00:00', '00:00', false),
  (1, '08:00', '20:00', true),
  (2, '08:00', '20:00', true),
  (3, '08:00', '20:00', true),
  (4, '08:00', '20:00', true),
  (5, '08:00', '20:00', true),
  (6, '08:00', '20:00', true)
on conflict (weekday) do nothing;

-- =========================================================================
-- ADMIN TASKS (Phase 2 — booking system)
-- =========================================================================
create table if not exists public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','done')),
  quote_id uuid references public.quotes(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_tasks_status_idx on public.admin_tasks(status);
create index if not exists admin_tasks_due_idx on public.admin_tasks(due_at);
grant select, insert, update, delete on public.admin_tasks to authenticated;
grant all on public.admin_tasks to service_role;
alter table public.admin_tasks enable row level security;

drop policy if exists "admin/staff full access tasks" on public.admin_tasks;
create policy "admin/staff full access tasks" on public.admin_tasks
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

-- Admin/staff write access to business_hours and blocked_times (schedule settings)
drop policy if exists "admin/staff write business hours" on public.business_hours;
create policy "admin/staff write business hours" on public.business_hours
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "admin/staff write blocked times" on public.blocked_times;
create policy "admin/staff write blocked times" on public.blocked_times
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

-- =========================================================================
-- BUSINESS SETTINGS (Google Calendar refresh token, etc.)
-- Server-only access: only service_role can read/write. Never expose to anon.
-- =========================================================================
create table if not exists public.business_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant all on public.business_settings to service_role;
alter table public.business_settings enable row level security;
-- No policies on purpose: only service_role (which bypasses RLS) can access.

-- Ensure appointments.google_event_id exists for older deployments.
alter table public.appointments
  add column if not exists google_event_id text;
