-- Kurage launches with a single platform-wide paid membership.
-- Any pre-launch tier assigned during development is consolidated into Maré.
UPDATE users
SET subscription_tier = 'MARE'
WHERE subscription_tier IN ('PLUS', 'PRO', 'MAX');

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_subscription_tier_check;

ALTER TABLE users
    ADD CONSTRAINT users_subscription_tier_check
    CHECK (subscription_tier IN ('FREE', 'MARE'));
