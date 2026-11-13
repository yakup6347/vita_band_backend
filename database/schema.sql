-- ULGEN schema v1. Import only into an empty selected database.
-- No DROP statements. UTC is a connection convention for DATETIME fields.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_is_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE devices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    device_code VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_key_hash VARCHAR(255) NULL,
    battery_level TINYINT UNSIGNED NULL,
    firmware_version VARCHAR(50) NULL,
    last_seen_at DATETIME NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_devices_code UNIQUE (device_code),
    CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_devices_battery CHECK (battery_level BETWEEN 0 AND 100),
    CONSTRAINT chk_devices_is_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE measurements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    device_id BIGINT UNSIGNED NOT NULL,
    sample_id VARCHAR(64) NOT NULL,
    measured_at DATETIME(3) NOT NULL,
    received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    heart_rate_bpm DECIMAL(6,2) NULL,
    spo2_percent DECIMAL(5,2) NULL,
    gsr_raw INT UNSIGNED NULL,
    stress_index DECIMAL(8,3) NULL,
    movement VARCHAR(32) NOT NULL DEFAULT 'unknown',
    wear_detected BOOLEAN NULL,
    heart_rate_valid BOOLEAN NOT NULL DEFAULT FALSE,
    spo2_valid BOOLEAN NOT NULL DEFAULT FALSE,
    gsr_valid BOOLEAN NOT NULL DEFAULT FALSE,
    stress_valid BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    CONSTRAINT fk_measurements_device
        FOREIGN KEY (device_id) REFERENCES devices(id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_measurements_sample
        UNIQUE (device_id, sample_id),
    INDEX idx_measurements_device_time (device_id, measured_at),
    CONSTRAINT chk_measurements_spo2
        CHECK (spo2_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_measurements_flags
        CHECK (
            (wear_detected IS NULL OR wear_detected IN (0, 1))
            AND heart_rate_valid IN (0, 1)
            AND spo2_valid IN (0, 1)
            AND gsr_valid IN (0, 1)
            AND stress_valid IN (0, 1)
        ),
    CONSTRAINT chk_measurements_valid_values
        CHECK (
            (heart_rate_valid = 0 OR heart_rate_bpm IS NOT NULL)
            AND (spo2_valid = 0 OR spo2_percent IS NOT NULL)
            AND (gsr_valid = 0 OR gsr_raw IS NOT NULL)
            AND (stress_valid = 0 OR stress_index IS NOT NULL)
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE access_permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    owner_id BIGINT UNSIGNED NOT NULL,
    viewer_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    accepted_at DATETIME(3) NULL,
    revoked_at DATETIME(3) NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_access_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_access_viewer
        FOREIGN KEY (viewer_id) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_access_owner_viewer
        UNIQUE (owner_id, viewer_id),

    INDEX idx_access_viewer_status (viewer_id, status),

    CONSTRAINT chk_access_different_users
        CHECK (owner_id <> viewer_id),

    CONSTRAINT chk_access_status
        CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE thresholds (
    user_id BIGINT UNSIGNED NOT NULL,
    min_heart_rate_bpm DECIMAL(6,2) NULL,
    max_heart_rate_bpm DECIMAL(6,2) NULL,
    min_spo2_percent DECIMAL(5,2) NULL,
    fall_impact_threshold_g DECIMAL(10,4) NULL,
    stress_threshold DECIMAL(8,3) NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (user_id),

    CONSTRAINT fk_thresholds_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_thresholds_min_hr
        CHECK (min_heart_rate_bpm > 0),

    CONSTRAINT chk_thresholds_max_hr
        CHECK (max_heart_rate_bpm > 0),

    CONSTRAINT chk_thresholds_hr_order
        CHECK (min_heart_rate_bpm < max_heart_rate_bpm),

    CONSTRAINT chk_thresholds_spo2
        CHECK (min_spo2_percent BETWEEN 0 AND 100),

    CONSTRAINT chk_thresholds_fall_impact
        CHECK (fall_impact_threshold_g > 0),

    CONSTRAINT chk_thresholds_enabled
        CHECK (is_enabled IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    device_id BIGINT UNSIGNED NOT NULL,
    measurement_id BIGINT UNSIGNED NULL,
    event_key VARCHAR(64) NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    detected_at DATETIME(3) NOT NULL,
    countdown_seconds SMALLINT UNSIGNED NOT NULL,
    deadline_at DATETIME(3) NOT NULL,
    resolved_at DATETIME(3) NULL,
    resolution_reason VARCHAR(255) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT fk_events_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_events_device
        FOREIGN KEY (device_id) REFERENCES devices(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_events_measurement
        FOREIGN KEY (measurement_id) REFERENCES measurements(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_events_device_key UNIQUE (device_id, event_key),

    INDEX idx_events_user_time (user_id, detected_at),
    INDEX idx_events_status_deadline (status, deadline_at),

    CONSTRAINT chk_events_type CHECK (
        event_type IN (
            'fall', 'high_heart_rate', 'low_heart_rate',
            'low_spo2', 'high_stress'
        )
    ),

    CONSTRAINT chk_events_status CHECK (
        status IN ('pending', 'cancelled', 'escalated', 'resolved')
    ),

    CONSTRAINT chk_events_countdown CHECK (countdown_seconds > 0),

    CONSTRAINT chk_events_deadline CHECK (deadline_at >= created_at),

    CONSTRAINT chk_events_resolution_time CHECK (
        resolved_at IS NULL OR resolved_at >= created_at
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contacts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    linked_user_id BIGINT UNSIGNED NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(32) NULL,
    priority SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    phone_verified_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT fk_contacts_owner
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_contacts_linked_user
        FOREIGN KEY (linked_user_id) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_contacts_linked_user UNIQUE (user_id, linked_user_id),
    CONSTRAINT uq_contacts_phone UNIQUE (user_id, phone_number),

    INDEX idx_contacts_owner_priority (user_id, priority, id),

    CONSTRAINT chk_contacts_not_self
        CHECK (linked_user_id IS NULL OR linked_user_id <> user_id),

    CONSTRAINT chk_contacts_destination
        CHECK (linked_user_id IS NOT NULL OR phone_number IS NOT NULL),

    CONSTRAINT chk_contacts_phone_nonempty
        CHECK (phone_number IS NULL OR CHAR_LENGTH(TRIM(phone_number)) > 0),

    CONSTRAINT chk_contacts_priority CHECK (priority > 0),
    CONSTRAINT chk_contacts_active CHECK (is_active IN (0, 1)),

    CONSTRAINT chk_contacts_phone_verification
        CHECK (phone_verified_at IS NULL OR phone_number IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE push_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    platform VARCHAR(16) NOT NULL,
    installation_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    token TEXT NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    last_registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_used_at DATETIME(3) NULL,
    revoked_at DATETIME(3) NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_push_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_push_tokens_installation UNIQUE (provider, installation_id),
    CONSTRAINT uq_push_tokens_hash UNIQUE (provider, token_hash),

    INDEX idx_push_tokens_user_active (user_id, is_active),

    CONSTRAINT chk_push_tokens_platform CHECK (platform IN ('android', 'ios')),
    CONSTRAINT chk_push_tokens_active CHECK (is_active IN (0, 1)),
    CONSTRAINT chk_push_tokens_provider CHECK (CHAR_LENGTH(TRIM(provider)) > 0),
    CONSTRAINT chk_push_tokens_installation CHECK (CHAR_LENGTH(TRIM(installation_id)) > 0),
    CONSTRAINT chk_push_tokens_nonempty CHECK (CHAR_LENGTH(TRIM(token)) > 0),
    CONSTRAINT chk_push_tokens_hash CHECK (
        CHAR_LENGTH(token_hash) = 64
        AND token_hash NOT REGEXP '[^0-9a-f]'
    ),
    CONSTRAINT chk_push_tokens_revoked CHECK (is_active = 0 OR revoked_at IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    recipient_user_id BIGINT UNSIGNED NULL,
    recipient_contact_id BIGINT UNSIGNED NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    type VARCHAR(32) NOT NULL,
    channel VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'queued',
    sent_at DATETIME(3) NULL,
    read_at DATETIME(3) NULL,
    provider_message_id VARCHAR(255) NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_notifications_event
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (recipient_user_id) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_notifications_contact
        FOREIGN KEY (recipient_contact_id) REFERENCES contacts(id)
        ON DELETE RESTRICT,

    INDEX idx_notifications_recipient (recipient_user_id, id),
    INDEX idx_notifications_status (status, id),

    CONSTRAINT chk_notifications_recipient CHECK (
        recipient_user_id IS NOT NULL OR recipient_contact_id IS NOT NULL
    ),

    CONSTRAINT chk_notifications_channel CHECK (channel IN ('push', 'sms')),

    CONSTRAINT chk_notifications_push_user CHECK (
        channel <> 'push' OR recipient_user_id IS NOT NULL
    ),

    CONSTRAINT chk_notifications_status CHECK (
        status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled')
    ),

    CONSTRAINT chk_notifications_type CHECK (
        type IN ('countdown', 'emergency')
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
