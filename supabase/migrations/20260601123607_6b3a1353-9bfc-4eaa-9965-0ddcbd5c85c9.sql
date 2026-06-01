
-- 1. Enum de papéis ministeriais
CREATE TYPE public.app_role AS ENUM ('admin', 'treasurer', 'secretary', 'branch_leader');

-- 2. Tabela organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Tabela org_members (vínculo usuário ↔ organização + papel)
CREATE TABLE public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  branch_church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- 4. Tabela invitations
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  role public.app_role NOT NULL,
  branch_church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  accepted_by_user_id uuid
);
CREATE INDEX idx_invitations_email_lower ON public.invitations (lower(email)) WHERE status = 'pending';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 5. Adicionar organization_id às tabelas existentes
ALTER TABLE public.churches    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.members     ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.events      ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 6. Backfill — uma organização por owner_id atual
INSERT INTO public.organizations (id, name, owner_user_id, created_at)
SELECT gen_random_uuid(), 'Minha Igreja', owner_id, MIN(created_at)
FROM public.churches
GROUP BY owner_id
ON CONFLICT DO NOTHING;

-- vincula owners como admin
INSERT INTO public.org_members (organization_id, user_id, role)
SELECT o.id, o.owner_user_id, 'admin'::public.app_role
FROM public.organizations o
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- backfill organization_id nas tabelas
UPDATE public.churches c SET organization_id = o.id FROM public.organizations o WHERE c.owner_id = o.owner_user_id AND c.organization_id IS NULL;
UPDATE public.members m SET organization_id = o.id FROM public.organizations o WHERE m.owner_id = o.owner_user_id AND m.organization_id IS NULL;
UPDATE public.transactions t SET organization_id = o.id FROM public.organizations o WHERE t.owner_id = o.owner_user_id AND t.organization_id IS NULL;
UPDATE public.events e SET organization_id = o.id FROM public.organizations o WHERE e.owner_id = o.owner_user_id AND e.organization_id IS NULL;

-- 7. Funções helper (SECURITY DEFINER para evitar recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members WHERE user_id = _user AND organization_id = _org);
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user uuid, _org uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members WHERE user_id = _user AND organization_id = _org AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_role(_user uuid, _org uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.org_members WHERE user_id = _user AND organization_id = _org LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_branch(_user uuid, _org uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch_church_id FROM public.org_members WHERE user_id = _user AND organization_id = _org LIMIT 1;
$$;

-- RLS: organizations — membro vê; só dono atualiza
CREATE POLICY "members can view organization" ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id) OR owner_user_id = auth.uid());
CREATE POLICY "owner can update organization" ON public.organizations FOR UPDATE
  USING (owner_user_id = auth.uid());
CREATE POLICY "auth user can create own organization" ON public.organizations FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- RLS: org_members — membro da org vê todos da org; admin/owner gerencia
CREATE POLICY "org members view team" ON public.org_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "admin manages team" ON public.org_members FOR ALL
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_user_id = auth.uid())
  )
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_user_id = auth.uid())
  );

-- RLS: invitations — admin vê/gerencia; o próprio convidado pode ver pelo email
CREATE POLICY "admin manages invitations" ON public.invitations FOR ALL
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_user_id = auth.uid())
  )
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_user_id = auth.uid())
  );

-- Policies adicionais para tabelas existentes (membros da equipe)
-- churches: qualquer membro da org vê; admin gerencia
CREATE POLICY "team can view org churches" ON public.churches FOR SELECT
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "admin can manage org churches" ON public.churches FOR ALL
  USING (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'admin'));

-- members: secretário e admin podem tudo; tesoureiro vê; líder de filial vê só sua filial
CREATE POLICY "team can view org members" ON public.members FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','secretary','treasurer')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  );
CREATE POLICY "secretary admin manage members" ON public.members FOR ALL
  USING (
    organization_id IS NOT NULL
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','secretary')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','secretary')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  );

-- transactions: tesoureiro e admin podem tudo; secretário não vê; líder de filial vê só da sua filial
CREATE POLICY "treasurer admin view tx" ON public.transactions FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','treasurer')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  );
CREATE POLICY "treasurer admin manage tx" ON public.transactions FOR ALL
  USING (
    organization_id IS NOT NULL
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','treasurer')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','treasurer')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  );

-- events: secretário e admin gerenciam; todos da org veem (filial só sua)
CREATE POLICY "team view events" ON public.events FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','secretary','treasurer')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  );
CREATE POLICY "secretary admin manage events" ON public.events FOR ALL
  USING (
    organization_id IS NOT NULL
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','secretary')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND (
      public.get_user_org_role(auth.uid(), organization_id) IN ('admin','secretary')
      OR (public.get_user_org_role(auth.uid(), organization_id) = 'branch_leader'
          AND church_id = public.get_user_branch(auth.uid(), organization_id))
    )
  );

-- 8. Auto-criação de organização para novos usuários + aceite de convite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(NEW.email);
  v_invitation public.invitations%ROWTYPE;
  v_new_org_id uuid;
BEGIN
  -- cria profile (mantém comportamento anterior)
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT DO NOTHING;

  -- procura convite pendente com este email
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE lower(email) = v_email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.org_members (organization_id, user_id, role, branch_church_id)
    VALUES (v_invitation.organization_id, NEW.id, v_invitation.role, v_invitation.branch_church_id)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.invitations
    SET status = 'accepted', accepted_at = now(), accepted_by_user_id = NEW.id
    WHERE id = v_invitation.id;
  ELSE
    -- cria organização própria
    INSERT INTO public.organizations (name, owner_user_id)
    VALUES ('Minha Igreja', NEW.id)
    RETURNING id INTO v_new_org_id;

    INSERT INTO public.org_members (organization_id, user_id, role)
    VALUES (v_new_org_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

-- garante trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
