-- Optional, private contact data. Public profiles and user search must never
-- serialize these fields. Delivery remains disabled until a future verification
-- and opt-in flow exists for each channel.

ALTER TABLE users
    ADD COLUMN email VARCHAR(254),
    ADD COLUMN phone_e164 VARCHAR(16);

CREATE INDEX idx_users_email_contact ON users (email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone_contact ON users (phone_e164) WHERE phone_e164 IS NOT NULL;
