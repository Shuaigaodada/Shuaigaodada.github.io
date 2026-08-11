CREATE TABLE IF NOT EXISTS public.email_verifications (
    verification_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_verifications_expires_at_idx
    ON public.email_verifications(expires_at);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_verifications_service_role_all ON public.email_verifications;
CREATE POLICY email_verifications_service_role_all
    ON public.email_verifications FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON TABLE public.email_verifications TO service_role;
