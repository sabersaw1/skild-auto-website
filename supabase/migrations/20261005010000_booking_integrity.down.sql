-- Rollback for 20261005010000_booking_integrity.sql (keeps btree_gist; it's harmless).
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_end_after_start;
DROP INDEX IF EXISTS public.appointments_idempotency_key_key;
ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS calendar_synced_at,
  DROP COLUMN IF EXISTS confirmation_email_sent_at,
  DROP COLUMN IF EXISTS delivery_attempts,
  DROP COLUMN IF EXISTS last_delivery_error,
  DROP COLUMN IF EXISTS is_test;
