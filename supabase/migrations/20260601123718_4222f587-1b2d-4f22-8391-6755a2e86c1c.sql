
CREATE OR REPLACE FUNCTION public.set_organization_id_from_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT id INTO NEW.organization_id
    FROM public.organizations
    WHERE owner_user_id = NEW.owner_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_churches_set_org BEFORE INSERT ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_owner();
CREATE TRIGGER trg_members_set_org BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_owner();
CREATE TRIGGER trg_transactions_set_org BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_owner();
CREATE TRIGGER trg_events_set_org BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_owner();

REVOKE EXECUTE ON FUNCTION public.set_organization_id_from_owner() FROM PUBLIC, anon;
