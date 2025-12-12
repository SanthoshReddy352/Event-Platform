-- ====================================================================================
-- FINAL RECOVERY SCRIPT (v3 - Handles Duplicates)
-- ====================================================================================

-- 1. Ensure the `updated_at` column exists
ALTER TABLE participants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. CLEANUP DUPLICATES (Crucial Step!)
-- We cannot create a unique index if duplicates exist.
-- This command keeps the LATEST record and deletes older duplicates for the same (event, user).
DELETE FROM participants a USING participants b
WHERE a.ctid < b.ctid              -- "a" is older than "b"
AND a.event_id = b.event_id        -- same event
AND a.user_id = b.user_id;         -- same user

-- 3. Create the Unique Index
DROP INDEX IF EXISTS idx_participants_event_user;
CREATE UNIQUE INDEX idx_participants_event_user ON participants(event_id, user_id);

-- 4. Register/Update the user
INSERT INTO participants (
    event_id,
    user_id,
    payment_id,
    order_id,
    status,
    payment_status,
    responses,
    updated_at,
    created_at
)
VALUES (
    '11579daf-4065-45b9-9df3-081556aa2a5f',
    '567e470e-9c97-44b5-b3ac-865837d7fd63',
    'pay_RqZxqS3PgvEfez',
    'order_RqZvruqaDMy0va',
    'approved',
    'paid',
    '{}'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (event_id, user_id) 
DO UPDATE SET
    status = 'approved',
    payment_id = EXCLUDED.payment_id,
    order_id = EXCLUDED.order_id,
    payment_status = 'paid',
    updated_at = NOW();
