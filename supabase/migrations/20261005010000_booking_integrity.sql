-- Booking integrity (Johnny HQ booking spec, Skild Phase 3).
--  1. The database itself refuses two active bookings that overlap in time, even if two
--     customers click the same slot in the same second (exclusion constraint).
--  2. idempotency_key: pressing Submit twice (or retrying) can't create a second booking.
--  3. Delivery tracking: when the calendar event / confirmation email went out, how many
--     tries it took and the last error, so nothing fails silently (HQ alerts on gaps).
--  4. is_test: the weekly robot test booking is marked and never treated as a real customer.
-- Checked before writing this: production had 0 overlapping active bookings (2026-10-05).
-- Rollback: 20261005010000_booking_integrity.down.sql
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS calendar_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_delivery_error text,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_idempotency_key_key
  ON public.appointments (idempotency_key) WHERE idempotency_key IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap') THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_no_overlap
      EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)
      WHERE (status NOT IN ('cancelled', 'no_show'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_end_after_start') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_end_after_start CHECK (end_at > start_at);
  END IF;
END $$;
