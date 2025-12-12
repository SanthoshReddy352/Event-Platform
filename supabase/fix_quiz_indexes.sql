-- Add composite index for quiz attempts to prevent full table scans
-- during start of quiz (checking existing attempts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_event_user 
ON quiz_attempts(event_id, user_id);
