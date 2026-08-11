CREATE TABLE IF NOT EXISTS public.blackjack_table_routes (
    table_id TEXT PRIMARY KEY,
    authority TEXT CHECK (authority IN ('tencent', 'cloudflare')),
    first_user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    first_tencent_ms INTEGER NOT NULL CHECK (first_tencent_ms BETWEEN 1 AND 10000),
    first_cloudflare_ms INTEGER NOT NULL CHECK (first_cloudflare_ms BETWEEN 1 AND 10000),
    second_user_id TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
    second_tencent_ms INTEGER CHECK (second_tencent_ms BETWEEN 1 AND 10000),
    second_cloudflare_ms INTEGER CHECK (second_cloudflare_ms BETWEEN 1 AND 10000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '6 hours'
);

CREATE OR REPLACE FUNCTION public.claim_blackjack_table_route(
    p_table_id TEXT,
    p_user_id TEXT,
    p_tencent_ms INTEGER,
    p_cloudflare_ms INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    route public.blackjack_table_routes%ROWTYPE;
    selected_authority TEXT;
BEGIN
    IF p_table_id !~ '^table-[1-5]$' THEN
        RAISE EXCEPTION 'invalid table id';
    END IF;

    p_tencent_ms := LEAST(10000, GREATEST(1, p_tencent_ms));
    p_cloudflare_ms := LEAST(10000, GREATEST(1, p_cloudflare_ms));

    INSERT INTO public.blackjack_table_routes (
        table_id, first_user_id, first_tencent_ms, first_cloudflare_ms
    ) VALUES (
        p_table_id, p_user_id, p_tencent_ms, p_cloudflare_ms
    ) ON CONFLICT (table_id) DO NOTHING;

    SELECT * INTO route FROM public.blackjack_table_routes
    WHERE table_id = p_table_id FOR UPDATE;

    IF route.expires_at <= NOW() THEN
        UPDATE public.blackjack_table_routes SET
            authority = NULL,
            first_user_id = p_user_id,
            first_tencent_ms = p_tencent_ms,
            first_cloudflare_ms = p_cloudflare_ms,
            second_user_id = NULL,
            second_tencent_ms = NULL,
            second_cloudflare_ms = NULL,
            created_at = NOW(),
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '6 hours'
        WHERE table_id = p_table_id
        RETURNING * INTO route;
    END IF;

    IF route.authority IS NULL AND route.first_user_id <> p_user_id THEN
        selected_authority := CASE
            WHEN GREATEST(route.first_tencent_ms, p_tencent_ms)
               <= GREATEST(route.first_cloudflare_ms, p_cloudflare_ms)
            THEN 'tencent' ELSE 'cloudflare' END;
        UPDATE public.blackjack_table_routes SET
            authority = selected_authority,
            second_user_id = p_user_id,
            second_tencent_ms = p_tencent_ms,
            second_cloudflare_ms = p_cloudflare_ms,
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '6 hours'
        WHERE table_id = p_table_id
        RETURNING * INTO route;
    ELSIF route.authority IS NULL AND route.created_at <= NOW() - INTERVAL '8 seconds' THEN
        selected_authority := CASE
            WHEN route.first_tencent_ms <= route.first_cloudflare_ms
            THEN 'tencent' ELSE 'cloudflare' END;
        UPDATE public.blackjack_table_routes SET
            authority = selected_authority,
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '6 hours'
        WHERE table_id = p_table_id
        RETURNING * INTO route;
    END IF;

    RETURN jsonb_build_object(
        'tableId', route.table_id,
        'status', CASE WHEN route.authority IS NULL THEN 'pending' ELSE 'assigned' END,
        'authority', route.authority,
        'expiresAt', FLOOR(EXTRACT(EPOCH FROM route.expires_at) * 1000)::BIGINT
    );
END;
$$;

ALTER TABLE public.blackjack_table_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blackjack_table_routes_service_role_all ON public.blackjack_table_routes;
CREATE POLICY blackjack_table_routes_service_role_all
    ON public.blackjack_table_routes FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON TABLE public.blackjack_table_routes TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_blackjack_table_route(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
