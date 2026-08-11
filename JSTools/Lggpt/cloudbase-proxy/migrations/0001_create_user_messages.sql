CREATE TABLE IF NOT EXISTS public.user_messages (
    id text PRIMARY KEY,
    conversation_id text NOT NULL,
    visitor_id text NOT NULL,
    content text NOT NULL,
    model text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_messages_created_at
    ON public.user_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_messages_visitor_id
    ON public.user_messages(visitor_id);

CREATE INDEX IF NOT EXISTS idx_user_messages_conversation_id
    ON public.user_messages(conversation_id);

ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_messages TO service_role;
