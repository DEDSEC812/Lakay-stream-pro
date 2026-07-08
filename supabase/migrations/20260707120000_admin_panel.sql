-- Admin panel: audit log + role management policies

-- Audit log table: records every admin action against a user
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_target_user_id ON public.audit_logs (target_user_id);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid()
  );

-- Allow admins to grant/revoke roles (previously SELECT-only)
CREATE POLICY "Admins can grant roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke roles" ON public.user_roles
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    -- an admin cannot remove their own admin role (avoids accidental lockout)
    AND NOT (user_id = auth.uid() AND role = 'admin')
  );

-- Useful indexes for the admin user list (search / sort / filter)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles (plan);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
