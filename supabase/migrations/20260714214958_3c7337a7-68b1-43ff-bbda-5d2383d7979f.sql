-- Revoke direct EXECUTE on SECURITY DEFINER functions from client roles.
-- Trigger-only functions: revoke from all client roles (only Postgres invokes them).
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_organization_id_from_owner() FROM PUBLIC, anon, authenticated;

-- RLS helper functions: revoke from PUBLIC and anon; keep authenticated (used inside RLS policies).
REVOKE ALL ON FUNCTION public.get_user_org_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_branch(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;

-- Ensure protect_matriz trigger fn is not callable directly either.
REVOKE ALL ON FUNCTION public.protect_matriz() FROM PUBLIC, anon, authenticated;