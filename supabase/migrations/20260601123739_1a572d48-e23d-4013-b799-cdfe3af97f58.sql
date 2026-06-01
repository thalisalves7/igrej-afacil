
CREATE OR REPLACE FUNCTION public.set_organization_id_from_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.org_members
    WHERE user_id = NEW.owner_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
