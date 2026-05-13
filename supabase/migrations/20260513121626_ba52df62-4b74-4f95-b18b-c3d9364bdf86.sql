
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS ministerial_role text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tither_name text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tither_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tx_tither_name ON public.transactions(tither_name);
CREATE INDEX IF NOT EXISTS idx_members_role ON public.members(ministerial_role);
