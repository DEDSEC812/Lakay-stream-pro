-- Store the billing email Stripe has on file for the customer at the time
-- of each subscription sync (useful for support/admin lookup even if the
-- user later changes their account email).
ALTER TABLE public.subscriptions ADD COLUMN billing_email TEXT;
