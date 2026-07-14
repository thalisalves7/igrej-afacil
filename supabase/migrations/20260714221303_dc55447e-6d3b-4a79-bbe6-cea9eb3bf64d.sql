
-- Recreate enum with new values
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM (
  'dono','admin_filial','secretario','tesoureiro','lider_louvor','diacono'
);

-- Drop every policy that referenced the old enum via helper functions
DROP POLICY IF EXISTS "admin can manage org churches" ON public.churches;
DROP POLICY IF EXISTS "team can view org churches" ON public.churches;
DROP POLICY IF EXISTS "secretary admin manage events" ON public.events;
DROP POLICY IF EXISTS "team view events" ON public.events;
DROP POLICY IF EXISTS "secretary admin manage members" ON public.members;
DROP POLICY IF EXISTS "team can view org members" ON public.members;
DROP POLICY IF EXISTS "treasurer admin view tx" ON public.transactions;
DROP POLICY IF EXISTS "treasurer admin manage tx" ON public.transactions;
DROP POLICY IF EXISTS "admin manages team" ON public.org_members;
DROP POLICY IF EXISTS "admin manages invitations" ON public.invitations;

-- Convert columns to new enum
ALTER TABLE public.org_members
  ALTER COLUMN role TYPE public.app_role
  USING (CASE role::text
    WHEN 'admin' THEN 'admin_filial'
    WHEN 'treasurer' THEN 'tesoureiro'
    WHEN 'secretary' THEN 'secretario'
    WHEN 'branch_leader' THEN 'admin_filial'
    ELSE 'admin_filial' END::public.app_role);

ALTER TABLE public.invitations
  ALTER COLUMN role TYPE public.app_role
  USING (CASE role::text
    WHEN 'admin' THEN 'admin_filial'
    WHEN 'treasurer' THEN 'tesoureiro'
    WHEN 'secretary' THEN 'secretario'
    WHEN 'branch_leader' THEN 'admin_filial'
    ELSE 'admin_filial' END::public.app_role);

-- Promote organization owners to 'dono'
UPDATE public.org_members om SET role = 'dono'
  FROM public.organizations o
 WHERE o.id = om.organization_id AND o.owner_user_id = om.user_id;

-- Recreate helper functions against the new enum (CASCADE drop is safe now that policies are gone)
DROP FUNCTION IF EXISTS public.get_user_org_role(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, public.app_role_old) CASCADE;
DROP TYPE public.app_role_old;

CREATE OR REPLACE FUNCTION public.get_user_org_role(_user uuid, _org uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.org_members WHERE user_id = _user AND organization_id = _org LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user uuid, _org uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members WHERE user_id = _user AND organization_id = _org AND role = _role);
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_org_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.app_role) TO authenticated;

-- Recreate policies with new roles
-- CHURCHES
CREATE POLICY "team can view org churches" ON public.churches FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "dono can manage org churches" ON public.churches FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'dono'))
  WITH CHECK (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'dono'));

-- MEMBERS
CREATE POLICY "team can view org members" ON public.members FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','secretario','tesoureiro','lider_louvor')
      OR (public.get_user_org_role(auth.uid(), organization_id) IN ('admin_filial','diacono')
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ));
CREATE POLICY "staff manage members" ON public.members FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','secretario')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'admin_filial'
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ))
  WITH CHECK (organization_id IS NOT NULL AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','secretario')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'admin_filial'
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ));

-- EVENTS
CREATE POLICY "team view events" ON public.events FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','secretario','tesoureiro','lider_louvor')
      OR (public.get_user_org_role(auth.uid(), organization_id) IN ('admin_filial','diacono')
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ));
CREATE POLICY "staff manage events" ON public.events FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','secretario','lider_louvor')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'admin_filial'
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ))
  WITH CHECK (organization_id IS NOT NULL AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','secretario','lider_louvor')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'admin_filial'
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ));

-- TRANSACTIONS
CREATE POLICY "treasury view tx" ON public.transactions FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','tesoureiro')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'admin_filial'
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ));
CREATE POLICY "treasury manage tx" ON public.transactions FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','tesoureiro')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'admin_filial'
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ))
  WITH CHECK (organization_id IS NOT NULL AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('dono','tesoureiro')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'admin_filial'
          AND (public.get_user_branch(auth.uid(), organization_id) IS NULL
               OR church_id = public.get_user_branch(auth.uid(), organization_id)))
    ));

-- ORG_MEMBERS
CREATE POLICY "members read own org members" ON public.org_members FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "dono admin manage team" ON public.org_members FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'dono')
      OR public.has_org_role(auth.uid(), organization_id, 'admin_filial'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'dono')
           OR public.has_org_role(auth.uid(), organization_id, 'admin_filial'));

-- INVITATIONS
CREATE POLICY "dono admin manage invitations" ON public.invitations FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'dono')
      OR public.has_org_role(auth.uid(), organization_id, 'admin_filial'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'dono')
           OR public.has_org_role(auth.uid(), organization_id, 'admin_filial'));

-- === Members promotion columns ===
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS cargo_id text,
  ADD COLUMN IF NOT EXISTS access_app boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

-- === promote_member ===
CREATE OR REPLACE FUNCTION public.promote_member(_member_id uuid, _cargo_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_member public.members%ROWTYPE;
  v_org uuid;
  v_caller_role public.app_role;
  v_caller_branch uuid;
  v_target_user uuid;
  v_new_role public.app_role;
  v_access_app boolean := true;
  v_invitation_id uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_member FROM public.members WHERE id = _member_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'member not found'; END IF;

  SELECT organization_id INTO v_org FROM public.churches WHERE id = v_member.church_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'church has no organization'; END IF;

  SELECT role, branch_church_id INTO v_caller_role, v_caller_branch
    FROM public.org_members WHERE user_id = v_caller AND organization_id = v_org;
  IF v_caller_role NOT IN ('dono','admin_filial') THEN RAISE EXCEPTION 'no permission'; END IF;

  IF v_caller_role = 'admin_filial' AND v_caller_branch IS NOT NULL
     AND v_member.church_id <> v_caller_branch THEN
    RAISE EXCEPTION 'member not in your branch';
  END IF;

  CASE _cargo_id
    WHEN 'dono' THEN v_new_role := 'dono';
    WHEN 'admin_filial' THEN v_new_role := 'admin_filial';
    WHEN 'secretario' THEN v_new_role := 'secretario';
    WHEN 'tesoureiro' THEN v_new_role := 'tesoureiro';
    WHEN 'lider_louvor' THEN v_new_role := 'lider_louvor';
    WHEN 'diacono' THEN v_new_role := 'diacono';
    WHEN 'membro' THEN v_new_role := NULL; v_access_app := false;
    WHEN 'visitante' THEN v_new_role := NULL; v_access_app := false;
    ELSE RAISE EXCEPTION 'invalid cargo';
  END CASE;

  IF v_caller_role = 'admin_filial' AND _cargo_id IN ('dono','admin_filial') THEN
    RAISE EXCEPTION 'cannot assign role at or above your level';
  END IF;

  UPDATE public.members SET
    cargo_id = _cargo_id,
    access_app = v_access_app,
    type = CASE WHEN _cargo_id = 'visitante' THEN 'visitor' ELSE 'member' END,
    promoted_by = v_caller,
    promoted_at = now()
  WHERE id = _member_id;

  IF NOT v_access_app THEN
    IF v_member.email IS NOT NULL THEN
      DELETE FROM public.org_members om
        USING auth.users u
       WHERE om.organization_id = v_org
         AND om.user_id = u.id
         AND lower(u.email) = lower(v_member.email);
      UPDATE public.invitations SET status = 'revoked'
       WHERE organization_id = v_org
         AND lower(email) = lower(v_member.email)
         AND status = 'pending';
    END IF;
    RETURN jsonb_build_object('status','updated','access_app', false);
  END IF;

  IF v_member.email IS NULL OR length(trim(v_member.email)) = 0 THEN
    RAISE EXCEPTION 'member has no email';
  END IF;

  SELECT id INTO v_target_user FROM auth.users WHERE lower(email) = lower(v_member.email) LIMIT 1;

  IF v_target_user IS NOT NULL THEN
    INSERT INTO public.org_members (organization_id, user_id, role, branch_church_id)
    VALUES (v_org, v_target_user, v_new_role,
      CASE WHEN v_new_role IN ('admin_filial','secretario','tesoureiro','lider_louvor','diacono')
           THEN v_member.church_id ELSE NULL END)
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, branch_church_id = EXCLUDED.branch_church_id;
    RETURN jsonb_build_object('status','linked','user_id', v_target_user, 'access_app', true);
  END IF;

  INSERT INTO public.invitations (
    organization_id, invited_by_user_id, full_name, email, phone, role, branch_church_id
  ) VALUES (
    v_org, v_caller, v_member.name, lower(v_member.email), v_member.phone, v_new_role, v_member.church_id
  ) RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object('status','invited','invitation_id', v_invitation_id, 'access_app', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.promote_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_member(uuid, text) TO authenticated;

-- === revoke_org_member ===
CREATE OR REPLACE FUNCTION public.revoke_org_member(_org_member_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_target public.org_members%ROWTYPE;
  v_caller_role public.app_role;
  v_caller_branch uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_target FROM public.org_members WHERE id = _org_member_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  SELECT role, branch_church_id INTO v_caller_role, v_caller_branch
    FROM public.org_members WHERE user_id = v_caller AND organization_id = v_target.organization_id;
  IF v_caller_role NOT IN ('dono','admin_filial') THEN RAISE EXCEPTION 'no permission'; END IF;
  IF v_target.role = 'dono' AND v_caller_role <> 'dono' THEN RAISE EXCEPTION 'cannot revoke dono'; END IF;
  IF v_caller_role = 'admin_filial' THEN
    IF v_target.role IN ('dono','admin_filial') THEN RAISE EXCEPTION 'no permission'; END IF;
    IF v_caller_branch IS NOT NULL AND v_target.branch_church_id IS DISTINCT FROM v_caller_branch THEN
      RAISE EXCEPTION 'not in your branch';
    END IF;
  END IF;
  IF v_target.user_id = v_caller THEN RAISE EXCEPTION 'cannot revoke yourself'; END IF;
  DELETE FROM public.org_members WHERE id = _org_member_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_org_member(uuid) TO authenticated;
