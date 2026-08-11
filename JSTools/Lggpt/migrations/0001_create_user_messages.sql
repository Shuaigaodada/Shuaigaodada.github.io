CREATE TABLE IF NOT EXISTS user_messages (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
    model TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_messages_created_at
    ON user_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_messages_visitor_id
    ON user_messages(visitor_id);

CREATE INDEX IF NOT EXISTS idx_user_messages_conversation_id
    ON user_messages(conversation_id);
