-- Security fix (Supabase advisor: anon_security_definer_function_executable).
-- Two SECURITY DEFINER functions could be called by anyone on the internet through
-- /rest/v1/rpc/...: has_role() (used by the admin RLS policies) and rls_auto_enable().
-- Nobody signed out needs either one. Signed-in admins keep has_role() so policies work.
-- Rollback: see 20261005000000_revoke_public_definer_exec.down.sql
-- Prepared by Johnny HQ (task 006, Skild Phase 1). Apply to production only after staging + a fresh backup.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
