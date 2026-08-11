ALTER TABLE public.app_users
    ALTER COLUMN email DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_phone_number_unique_idx
    ON public.app_users(phone_number)
    WHERE phone_number IS NOT NULL;

ALTER TABLE public.email_verifications
    ALTER COLUMN email DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE INDEX IF NOT EXISTS email_verifications_phone_number_idx
    ON public.email_verifications(phone_number)
    WHERE phone_number IS NOT NULL;

GRANT ALL ON TABLE public.app_users TO service_role;
GRANT ALL ON TABLE public.email_verifications TO service_role;
