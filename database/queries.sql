-- Read-only examples for the sample_data.sql fixture.
-- In the API use bound parameters, not string concatenation or client-selected identity.
SET time_zone = '+00:00';
SET @device_id = (SELECT id FROM devices WHERE device_code = 'ULGEN-001');
SET @owner_id = (SELECT id FROM users WHERE email = 'test.kullanici@example.com');
SET @viewer_id = (SELECT id FROM users WHERE email = 'test.yakin@example.com');
SET @start_at = '2026-11-07 00:00:00.000';
SET @end_at = '2026-11-08 00:00:00.000';

-- 1. Latest packet, including invalid measurements. Expected TEST-0003, NULL heart rate.
SELECT id, sample_id, measured_at, received_at, heart_rate_bpm,
 heart_rate_valid, spo2_percent, spo2_valid, gsr_raw, gsr_valid,
 stress_index, stress_valid, wear_detected, movement
FROM measurements WHERE device_id = @device_id
ORDER BY measured_at DESC, id DESC LIMIT 1;

-- 2. Latest valid heart rate. Expected TEST-0002, 78.00.
SELECT id, sample_id, measured_at, heart_rate_bpm
FROM measurements
WHERE device_id = @device_id AND heart_rate_valid = TRUE AND heart_rate_bpm IS NOT NULL
ORDER BY measured_at DESC, id DESC LIMIT 1;

-- 3. History in [start, end), paginated. Expected 3 sample records.
SELECT id, sample_id, measured_at, heart_rate_bpm, heart_rate_valid, spo2_percent, spo2_valid
FROM measurements
WHERE device_id = @device_id AND measured_at >= @start_at AND measured_at < @end_at
ORDER BY measured_at ASC, id ASC LIMIT 100 OFFSET 0;

-- 4. Valid heart-rate summary. Expected 2, 76.50, 75.00, 78.00.
SELECT COUNT(*) AS valid_measurement_count,
 ROUND(AVG(heart_rate_bpm), 2) AS average_heart_rate,
 MIN(heart_rate_bpm) AS minimum_heart_rate,
 MAX(heart_rate_bpm) AS maximum_heart_rate
FROM measurements
WHERE device_id = @device_id AND heart_rate_valid = TRUE AND heart_rate_bpm IS NOT NULL
 AND measured_at >= @start_at AND measured_at < @end_at;

-- 5. Permission relationships only. Expected no rows: fixture permission is revoked.
-- Real authorization must additionally check session and account state.
SELECT p.id, u.id AS owner_id, u.full_name, p.accepted_at
FROM access_permissions AS p JOIN users AS u ON p.owner_id = u.id
WHERE p.viewer_id = @viewer_id AND p.status = 'accepted' AND p.revoked_at IS NULL
ORDER BY u.full_name, u.id;

-- 6. Expired pending events. Expected no rows: fixture event is escalated.
SELECT id, event_key, user_id, device_id, deadline_at
FROM events WHERE status = 'pending' AND deadline_at <= UTC_TIMESTAMP(3)
ORDER BY deadline_at, id;

-- 7. Emergency contacts. Expected one contact; not a permission to view health data.
SELECT id, linked_user_id, full_name, priority
FROM contacts WHERE user_id = @owner_id AND is_active = TRUE
ORDER BY priority, id;

-- 8. Eligible push registrations for an active account. Expected no rows.
SELECT p.id, p.provider, p.platform, p.installation_id
FROM push_tokens AS p JOIN users AS u ON p.user_id = u.id
WHERE p.user_id = @viewer_id AND p.is_active = TRUE
 AND p.revoked_at IS NULL AND u.is_active = TRUE;

-- 9. Notification history. Expected queued and NULL sending/reading/provider fields.
SELECT n.id, e.event_key, n.title, n.type, n.channel,
 n.status, n.sent_at, n.read_at, n.provider_message_id
FROM notifications AS n JOIN events AS e ON n.event_id = e.id
WHERE n.recipient_user_id = @viewer_id ORDER BY n.id DESC LIMIT 100;
