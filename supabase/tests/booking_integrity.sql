-- Database tests for the booking spec (run by CI after the migrations, on a throwaway copy).
-- Each block raises an exception (failing CI) if the guarantee doesn't hold.
BEGIN;
INSERT INTO public.appointments (start_at, end_at, status, idempotency_key, is_test)
  VALUES ('2030-01-07 16:00+00', '2030-01-07 17:00+00', 'pending', 'k-1', true);

-- 1. overlapping active booking is refused
DO $$ BEGIN
  BEGIN
    INSERT INTO public.appointments (start_at, end_at, status, is_test) VALUES ('2030-01-07 16:30+00', '2030-01-07 17:30+00', 'pending', true);
    RAISE EXCEPTION 'FAIL: overlapping booking was accepted';
  EXCEPTION WHEN exclusion_violation THEN RAISE NOTICE 'PASS: overlap refused';
  END;
END $$;
-- 2. back-to-back is fine (end is exclusive)
INSERT INTO public.appointments (start_at, end_at, status, is_test) VALUES ('2030-01-07 17:00+00', '2030-01-07 18:00+00', 'pending', true);
-- 3. a cancelled booking frees its slot
INSERT INTO public.appointments (start_at, end_at, status, is_test) VALUES ('2030-01-08 16:00+00', '2030-01-08 17:00+00', 'cancelled', true);
INSERT INTO public.appointments (start_at, end_at, status, is_test) VALUES ('2030-01-08 16:00+00', '2030-01-08 17:00+00', 'pending', true);
-- 4. the same submit key can't create a second booking
DO $$ BEGIN
  BEGIN
    INSERT INTO public.appointments (start_at, end_at, status, idempotency_key, is_test) VALUES ('2030-01-09 16:00+00', '2030-01-09 17:00+00', 'pending', 'k-1', true);
    RAISE EXCEPTION 'FAIL: duplicate submit key accepted';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS: duplicate submit refused';
  END;
END $$;
-- 5. end must be after start
DO $$ BEGIN
  BEGIN
    INSERT INTO public.appointments (start_at, end_at, status, is_test) VALUES ('2030-01-10 17:00+00', '2030-01-10 16:00+00', 'pending', true);
    RAISE EXCEPTION 'FAIL: end before start accepted';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS: bad time range refused';
  END;
END $$;
ROLLBACK;
