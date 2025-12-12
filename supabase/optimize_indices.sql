-- Speed up checking if a user is registered for an event
-- Table is 'participants', not 'registrations'
CREATE INDEX IF NOT EXISTS idx_participants_user_event_v2 ON participants(user_id, event_id);

-- Speed up fetching all attempts for a specific quiz
-- 'event_id' is the join key for quizzes (since events can be type='mcq')
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_event_id ON quiz_attempts(event_id);

-- Speed up event lookups by organizer (for Admin Dashboard)
-- Column is 'created_by', not 'organizer_id'
CREATE INDEX IF NOT EXISTS idx_events_created_by_v2 ON events(created_by);
