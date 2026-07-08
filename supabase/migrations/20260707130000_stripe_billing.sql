-- Stripe billing: subscriptions, invoices, webhook idempotency

ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT UNIQUE;

CREATE TYPE public.subscription_status AS ENUM (
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid'
);

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'paypal')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan public.plan_type NOT NULL DEFAULT 'vip',
  status public.subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions (status);

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'paypal')),
  provider_invoice_id TEXT UNIQUE,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX idx_invoices_created_at ON public.invoices (created_at DESC);

-- Webhook idempotency: each provider event is processed at most once
CREATE TABLE public.payment_events (
  id TEXT NOT NULL PRIMARY KEY,
  provider TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.payment_events TO service_role;

-- Only the owner (or an admin) can read their billing data.
-- Writes only ever happen server-side via the service role (webhooks), which
-- bypasses RLS entirely, so no INSERT/UPDATE/DELETE policy exists for
-- regular authenticated users on purpose.
CREATE POLICY "Users view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- payment_events has no SELECT/INSERT policy for authenticated/anon at all:
-- it is purely internal webhook bookkeeping, accessed only by service_role.
