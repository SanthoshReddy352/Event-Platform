-- Add email column to participants table
-- This allows storing the email of the participant at the time of registration
-- which is useful for sending notifications and potential future guest checkouts.

ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS email TEXT;
