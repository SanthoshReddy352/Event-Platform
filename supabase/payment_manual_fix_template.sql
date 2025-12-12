-- ====================================================================================
-- MANUAL RECOVERY SCRIPT
-- Use this if a user paid but the API failed to register them due to the missing column.
-- ====================================================================================

-- 1. First, ensure you have added the missing column (Run this ONLY if you haven't yet)
-- COPY content from supabase/add_updated_at.sql and run it first.
ALTER TABLE participants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Insert or Update the participant manually
-- Replace the placeholders below with the actual data from the failed transaction.
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
    'REPLACE_WITH_EVENT_ID',       -- e.g. 'a0eebc99-9c0b-...'
    'REPLACE_WITH_USER_ID',        -- e.g. 'b2f...'
    'REPLACE_WITH_PAYMENT_ID',     -- e.g. 'pay_...' (From Razorpay Dashboard)
    'REPLACE_WITH_ORDER_ID',       -- e.g. 'order_...' (From Razorpay Dashboard)
    'approved',
    'paid',
    '{}'::jsonb,                   -- Empty responses if you don't have them
    NOW(),
    NOW()
)
ON CONFLICT (event_id, user_id) 
-- Ensure you have a unique constraint on (event_id, user_id) for this to work as an upsert
DO UPDATE SET
    status = 'approved',
    payment_id = EXCLUDED.payment_id,
    order_id = EXCLUDED.order_id,
    payment_status = 'paid',
    updated_at = NOW();
