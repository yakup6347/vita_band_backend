-- TEST DATA ONLY. Run once after schema.sql in an empty, isolated test database.
-- Keep notification workers OFF. Accounts, wearable and push endpoint are inactive.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
START TRANSACTION;

INSERT INTO users (full_name, email, password_hash, is_active)
VALUES ('Örnek Kullanıcı', 'test.kullanici@example.com', '!', FALSE);
SET @owner_id = LAST_INSERT_ID();
INSERT INTO users (full_name, email, password_hash, is_active)
VALUES ('Örnek Yakın', 'test.yakin@example.com', '!', FALSE);
SET @viewer_id = LAST_INSERT_ID();

INSERT INTO devices (user_id, device_code, name, is_active)
VALUES (@owner_id, 'ULGEN-001', 'Test Bilekliği', FALSE);
SET @device_id = LAST_INSERT_ID();

INSERT INTO measurements (
 device_id, sample_id, measured_at, received_at,
 heart_rate_bpm, spo2_percent, gsr_raw, wear_detected,
 heart_rate_valid, spo2_valid, gsr_valid
) VALUES
 (@device_id, 'TEST-0001', '2026-11-07 17:32:57.400', '2026-11-07 17:32:57.400',
  75.00, 98.00, 1820, TRUE, TRUE, TRUE, TRUE),
 (@device_id, 'TEST-0002', '2026-11-07 17:38:21.116', '2026-11-07 17:38:21.116',
  78.00, 97.00, 1850, TRUE, TRUE, TRUE, TRUE),
 (@device_id, 'TEST-0003', '2026-11-07 17:45:00.000', '2026-11-07 17:45:00.000',
  NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE);

INSERT INTO access_permissions (
 owner_id, viewer_id, status, created_at, updated_at, accepted_at, revoked_at
) VALUES (
 @owner_id, @viewer_id, 'revoked', '2026-11-07 18:00:00.000',
 '2026-11-07 18:10:00.000', '2026-11-07 18:05:00.000', '2026-11-07 18:10:00.000'
);

-- Experimental test settings, not validated clinical emergency thresholds.
INSERT INTO thresholds (
 user_id, min_heart_rate_bpm, max_heart_rate_bpm, min_spo2_percent,
 fall_impact_threshold_g, stress_threshold, is_enabled
) VALUES (@owner_id, 60.00, 100.00, 95.00, 2.5000, NULL, FALSE);

INSERT INTO events (
 user_id, device_id, event_key, event_type, status, detected_at,
 countdown_seconds, deadline_at, created_at, updated_at
) VALUES (
 @owner_id, @device_id, 'TEST-FALL-0001', 'fall', 'escalated',
 '2026-11-07 18:30:00.000', 30, '2026-11-07 18:30:30.000',
 '2026-11-07 18:30:00.000', '2026-11-07 18:31:00.000'
);
SET @event_id = LAST_INSERT_ID();

INSERT INTO contacts (user_id, linked_user_id, full_name, priority)
VALUES (@owner_id, @viewer_id, 'Örnek Yakın', 1);
SET @contact_id = LAST_INSERT_ID();

SET @fake_token = 'TEST_ONLY_NOT_A_REAL_PUSH_TOKEN_0001';
INSERT INTO push_tokens (
 user_id, provider, platform, installation_id, token, token_hash, is_active
) VALUES (
 @viewer_id, 'test', 'android', 'TEST-INSTALL-0001',
 @fake_token, SHA2(@fake_token, 256), FALSE
);

INSERT INTO notifications (
 event_id, recipient_user_id, recipient_contact_id,
 title, message, type, channel, status
) VALUES (
 @event_id, @viewer_id, @contact_id, 'TEST: Olası düşme',
 'Bu, Ülgen veri tabanı denemesi için hazırlanmış bir bildirim kaydıdır.',
 'emergency', 'push', 'queued'
);
COMMIT;
