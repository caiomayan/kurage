-- PostgreSQL inbox model.
-- Team invitations and join requests already live in PostgreSQL. This migration
-- adds generic notification content plus one delivery/read-state row per user.

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(80) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_url VARCHAR(2048),
    priority SMALLINT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_created ON notifications (created_at DESC);
CREATE INDEX idx_notifications_expires ON notifications (expires_at)
    WHERE expires_at IS NOT NULL;

CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_delivery_recipient UNIQUE (notification_id, user_id)
);

CREATE INDEX idx_notification_deliveries_user_created
    ON notification_deliveries (user_id, created_at DESC);
CREATE INDEX idx_notification_deliveries_user_unread
    ON notification_deliveries (user_id, created_at DESC)
    WHERE read_at IS NULL;
