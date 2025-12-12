SELECT title, event_date, event_end_date, registration_open, is_active 
FROM events 
WHERE is_active = true 
ORDER BY created_at DESC;
