-- PayPal support: separate ID columns since PayPal order/subscription/plan
-- IDs have a different shape than Stripe's and both providers coexist.

ALTER TABLE public.subscriptions ADD COLUMN paypal_subscription_id TEXT UNIQUE;
ALTER TABLE public.subscriptions ADD COLUMN paypal_plan_id TEXT;

CREATE INDEX idx_subscriptions_paypal_subscription_id
  ON public.subscriptions (paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;
