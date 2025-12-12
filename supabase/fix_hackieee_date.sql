-- Update HackIEEE 2025. end date to future (end of month) to make it active again
UPDATE events 
SET event_end_date = '2025-12-30 18:00:00+00' 
WHERE title LIKE 'HackIEEE 2025%';
