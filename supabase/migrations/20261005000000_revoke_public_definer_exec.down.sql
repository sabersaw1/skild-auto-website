-- Rollback for 20261005000000_revoke_public_definer_exec.sql (restores the old, open grants).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC, anon, authenticated;
