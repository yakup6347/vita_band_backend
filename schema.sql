-- ========================================================
-- Vita Band IoT Akıllı Bileklik Veritabanı Şeması (MySQL)
-- ========================================================

CREATE DATABASE IF NOT EXISTS vita_band_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vita_band_db;

-- 1. Kullanıcılar Tablosu
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    emergency_contact VARCHAR(20) NULL, -- Acil durumda aranacak numara
    birth_date DATE NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    blood_type VARCHAR(10) NULL,        -- 'A+', '0-', vb.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Cihazlar / Akıllı Bileklikler Tablosu
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    mac_address VARCHAR(50) NOT NULL UNIQUE, -- BLE MAC Adresi
    device_name VARCHAR(100) NOT NULL,       -- 'VitaBand-01'
    serial_number VARCHAR(100) NULL UNIQUE,
    battery_level INT DEFAULT 100,           -- Pil seviyesi (%)
    firmware_version VARCHAR(50) NULL,
    is_online BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Sensör Telemetri Verileri Tablosu (Bileklik -> Mobil -> Backend)
CREATE TABLE IF NOT EXISTS telemetries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    heart_rate FLOAT NULL,       -- Nabız (BPM)
    spo2 FLOAT NULL,             -- Kandaki Oksijen (%)
    temperature FLOAT NULL,      -- Vücut Sıcaklığı (°C)
    step_count INT DEFAULT 0,    -- Adım Sayısı
    calories FLOAT DEFAULT 0.0,  -- Yakılan Kalori
    fall_detected BOOLEAN DEFAULT FALSE, -- Düşme Algılandı mı?
    accel_x FLOAT NULL,          -- İvmeölçer X
    accel_y FLOAT NULL,          -- İvmeölçer Y
    accel_z FLOAT NULL,          -- İvmeölçer Z
    battery_level INT NULL,
    recorded_at TIMESTAMP NOT NULL, -- Ölçümün yapıldığı an
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Sunucuya kayıt anı
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    INDEX idx_device_recorded (device_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Uyarı ve Acil Durum Alarmları Tablosu
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id INT NOT NULL,
    type ENUM(
        'FALL_DETECTED',     -- Düşme algılandı
        'HIGH_HEART_RATE',   -- Kritik yüksek nabız
        'LOW_HEART_RATE',    -- Kritik düşük nabız
        'LOW_SPO2',          -- Düşük oksijen doygunluğu
        'HIGH_TEMPERATURE',  -- Yüksek ateş
        'PANIC_BUTTON',      -- Acil durum panik butonu
        'LOW_BATTERY'        -- Kritik düşük şarj
    ) NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
