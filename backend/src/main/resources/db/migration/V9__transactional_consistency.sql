-- Normalize legacy inventory rows before enforcing the canonical API envelope.
UPDATE user_inventories
SET items = '{"items":{},"version":2}'::jsonb
WHERE jsonb_typeof(items) IS DISTINCT FROM 'object'
   OR jsonb_typeof(items -> 'items') IS DISTINCT FROM 'object'
   OR jsonb_typeof(items -> 'version') IS DISTINCT FROM 'number';

ALTER TABLE user_inventories
    ALTER COLUMN items SET DEFAULT '{"items":{},"version":2}'::jsonb,
    ADD COLUMN lock_version BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT user_inventories_canonical_items_check CHECK (
        jsonb_typeof(items) = 'object'
        AND jsonb_typeof(items -> 'items') = 'object'
        AND jsonb_typeof(items -> 'version') = 'number'
    );

-- There can be only one actionable request for a user/team pair. The service
-- still returns friendly validation errors; these indexes are the final guard
-- against two application instances racing each other.
WITH duplicate_invitations AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY team_id, invited_user_id
               ORDER BY created_at DESC, id DESC
           ) AS occurrence
    FROM team_invitations
    WHERE status = 'PENDING'
)
UPDATE team_invitations invitation
SET status = 'EXPIRED', updated_at = NOW()
FROM duplicate_invitations duplicate
WHERE invitation.id = duplicate.id
  AND duplicate.occurrence > 1;

WITH duplicate_requests AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY team_id, requester_id
               ORDER BY created_at DESC, id DESC
           ) AS occurrence
    FROM team_join_requests
    WHERE status = 'PENDING'
)
UPDATE team_join_requests request
SET status = 'REJECTED', updated_at = NOW()
FROM duplicate_requests duplicate
WHERE request.id = duplicate.id
  AND duplicate.occurrence > 1;

CREATE UNIQUE INDEX uq_team_invitations_pending
    ON team_invitations (team_id, invited_user_id)
    WHERE status = 'PENDING';

CREATE UNIQUE INDEX uq_team_join_requests_pending
    ON team_join_requests (team_id, requester_id)
    WHERE status = 'PENDING';

UPDATE team_invite_links
SET max_uses = GREATEST(max_uses, 1),
    current_uses = LEAST(GREATEST(current_uses, 0), GREATEST(max_uses, 1));

UPDATE team_invite_links
SET is_active = false
WHERE current_uses >= max_uses;

ALTER TABLE team_invite_links
    ADD CONSTRAINT team_invite_links_usage_check CHECK (
        max_uses > 0
        AND current_uses >= 0
        AND current_uses <= max_uses
    );
