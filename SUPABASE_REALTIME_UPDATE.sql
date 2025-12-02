-- Add columns for real-time persistence
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS marked_for_review JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';

-- Make score and completed_at nullable for in-progress attempts
ALTER TABLE quiz_attempts ALTER COLUMN score DROP NOT NULL;
ALTER TABLE quiz_attempts ALTER COLUMN completed_at DROP NOT NULL;
ALTER TABLE quiz_attempts ALTER COLUMN completed_at DROP DEFAULT;

-- Update RLS to ensure users can update their own in-progress attempts
DROP POLICY IF EXISTS "Users can update their own attempts" ON quiz_attempts;
CREATE POLICY "Users can update their own attempts" ON quiz_attempts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
