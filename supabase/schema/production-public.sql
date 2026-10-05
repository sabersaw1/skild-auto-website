--
-- PostgreSQL database dump
--

\restrict nhWDAMdsbqNs5ZaRRYSTYFpved4EGfnLPwmnLq3VqTPaGcDIUH65JUajFFbNhog

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Debian 17.11-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'staff',
    'customer'
);


--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_status AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);


--
-- Name: quote_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quote_status AS ENUM (
    'new',
    'contacted',
    'scheduled',
    'completed',
    'archived'
);


--
-- Name: vehicle_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicle_kind AS ENUM (
    'auto',
    'moto'
);


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    details text,
    due_at timestamp with time zone,
    status text DEFAULT 'open'::text NOT NULL,
    quote_id uuid,
    appointment_id uuid,
    customer_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_tasks_status_check CHECK ((status = ANY (ARRAY['open'::text, 'done'::text])))
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    quote_id uuid,
    vehicle_id uuid,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    status public.appointment_status DEFAULT 'pending'::public.appointment_status NOT NULL,
    location text,
    notes text,
    google_event_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blocked_times; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_times (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    weekday smallint NOT NULL,
    open_time time without time zone NOT NULL,
    close_time time without time zone NOT NULL,
    is_open boolean DEFAULT true NOT NULL,
    CONSTRAINT business_hours_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)))
);


--
-- Name: business_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_user_id uuid,
    full_name text,
    email text,
    phone text,
    location text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: google_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text DEFAULT 'google'::text NOT NULL,
    google_review_id text NOT NULL,
    location_id text,
    reviewer_name text,
    reviewer_photo_url text,
    rating smallint,
    comment text,
    review_created_at timestamp with time zone,
    review_updated_at timestamp with time zone,
    is_visible boolean DEFAULT true NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT google_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: project_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    image_type text DEFAULT 'additional'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    caption text,
    alt_text text,
    provider text DEFAULT 'cloudinary'::text NOT NULL,
    storage_ref text,
    url text NOT NULL,
    width integer,
    height integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_photos_image_type_check CHECK ((image_type = ANY (ARRAY['before'::text, 'after'::text, 'additional'::text])))
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    vehicle_kind public.vehicle_kind DEFAULT 'auto'::public.vehicle_kind NOT NULL,
    vehicle_year integer,
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
    is_published boolean DEFAULT false NOT NULL,
    customer_id uuid,
    vehicle_id uuid,
    quote_id uuid,
    appointment_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    url text NOT NULL,
    public_id text,
    format text,
    bytes integer,
    original_filename text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    vehicle_id uuid,
    requested_service text,
    description text,
    notes text,
    summary text,
    status public.quote_status DEFAULT 'new'::public.quote_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    kind public.vehicle_kind DEFAULT 'auto'::public.vehicle_kind NOT NULL,
    year integer,
    make text,
    model text,
    mileage text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_tasks admin_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_tasks
    ADD CONSTRAINT admin_tasks_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: blocked_times blocked_times_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_times
    ADD CONSTRAINT blocked_times_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_weekday_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_weekday_key UNIQUE (weekday);


--
-- Name: business_settings business_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_settings
    ADD CONSTRAINT business_settings_pkey PRIMARY KEY (key);


--
-- Name: customers customers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_email_key UNIQUE (email);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: google_reviews google_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_reviews
    ADD CONSTRAINT google_reviews_pkey PRIMARY KEY (id);


--
-- Name: google_reviews google_reviews_source_google_review_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_reviews
    ADD CONSTRAINT google_reviews_source_google_review_id_key UNIQUE (source, google_review_id);


--
-- Name: project_photos project_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_photos
    ADD CONSTRAINT project_photos_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_slug_key UNIQUE (slug);


--
-- Name: quote_photos quote_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_photos
    ADD CONSTRAINT quote_photos_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: admin_tasks_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_tasks_due_idx ON public.admin_tasks USING btree (due_at);


--
-- Name: admin_tasks_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_tasks_status_idx ON public.admin_tasks USING btree (status);


--
-- Name: appointments_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_start_idx ON public.appointments USING btree (start_at);


--
-- Name: appointments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_status_idx ON public.appointments USING btree (status);


--
-- Name: blocked_times_range_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blocked_times_range_idx ON public.blocked_times USING btree (start_at, end_at);


--
-- Name: google_reviews_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX google_reviews_created_idx ON public.google_reviews USING btree (review_created_at DESC);


--
-- Name: project_photos_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_photos_project_idx ON public.project_photos USING btree (project_id, image_type, sort_order);


--
-- Name: projects_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_published_idx ON public.projects USING btree (is_published, project_date DESC);


--
-- Name: quotes_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_created_at_idx ON public.quotes USING btree (created_at DESC);


--
-- Name: quotes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_status_idx ON public.quotes USING btree (status);


--
-- Name: admin_tasks admin_tasks_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_tasks
    ADD CONSTRAINT admin_tasks_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: admin_tasks admin_tasks_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_tasks
    ADD CONSTRAINT admin_tasks_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: admin_tasks admin_tasks_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_tasks
    ADD CONSTRAINT admin_tasks_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: customers customers_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: project_photos project_photos_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_photos
    ADD CONSTRAINT project_photos_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: projects projects_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: projects projects_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: projects projects_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: quote_photos quote_photos_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_photos
    ADD CONSTRAINT quote_photos_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: appointments admin/staff can read appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff can read appointments" ON public.appointments FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: customers admin/staff can read customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff can read customers" ON public.customers FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: quote_photos admin/staff can read quote photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff can read quote photos" ON public.quote_photos FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: quotes admin/staff can read quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff can read quotes" ON public.quotes FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: vehicles admin/staff can read vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff can read vehicles" ON public.vehicles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: appointments admin/staff can update appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff can update appointments" ON public.appointments FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: customers admin/staff can update customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff can update customers" ON public.customers FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: quotes admin/staff can update quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff can update quotes" ON public.quotes FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: admin_tasks admin/staff full access tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff full access tasks" ON public.admin_tasks TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: project_photos admin/staff manage project photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff manage project photos" ON public.project_photos TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: projects admin/staff manage projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff manage projects" ON public.projects TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: google_reviews admin/staff manage reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff manage reviews" ON public.google_reviews TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: blocked_times admin/staff write blocked times; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff write blocked times" ON public.blocked_times TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: business_hours admin/staff write business hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin/staff write business hours" ON public.business_hours TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: admin_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments anon can insert appointment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon can insert appointment" ON public.appointments FOR INSERT TO anon WITH CHECK (true);


--
-- Name: customers anon can insert customer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon can insert customer" ON public.customers FOR INSERT TO anon WITH CHECK (true);


--
-- Name: quotes anon can insert quote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon can insert quote" ON public.quotes FOR INSERT TO anon WITH CHECK (true);


--
-- Name: quote_photos anon can insert quote photo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon can insert quote photo" ON public.quote_photos FOR INSERT TO anon WITH CHECK (true);


--
-- Name: vehicles anon can insert vehicle; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon can insert vehicle" ON public.vehicles FOR INSERT TO anon WITH CHECK (true);


--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_times; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;

--
-- Name: business_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: business_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: google_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: project_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_times public read blocked times; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read blocked times" ON public.blocked_times FOR SELECT TO authenticated, anon USING (true);


--
-- Name: business_hours public read business hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read business hours" ON public.business_hours FOR SELECT TO authenticated, anon USING (true);


--
-- Name: project_photos public read published project photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read published project photos" ON public.project_photos FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_photos.project_id) AND p.is_published))));


--
-- Name: projects public read published projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read published projects" ON public.projects FOR SELECT TO anon USING (is_published);


--
-- Name: google_reviews public read visible reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read visible reviews" ON public.google_reviews FOR SELECT TO authenticated, anon USING (is_visible);


--
-- Name: quote_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user can read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "user can read own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict nhWDAMdsbqNs5ZaRRYSTYFpved4EGfnLPwmnLq3VqTPaGcDIUH65JUajFFbNhog

