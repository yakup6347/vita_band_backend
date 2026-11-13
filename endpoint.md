# ÜLGEN API SÖZLEŞMESİ
**Versiyon:** 1.1  
**Backend:** Node.js – Saf JavaScript  
**Mobil uygulama:** Flutter  
**Veritabanı:** MySQL

## 1. Genel API standartları

**Base URL**

```text
http://localhost:3000/api/v1
```

**Başarılı cevap formatı**

```json
{
  "success": true,
  "message": "İşlem başarılı.",
  "data": {}
}
```

**Hatalı cevap formatı**

```json
{
  "success": false,
  "message": "İşlem gerçekleştirilemedi.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": null
  }
}
```

**Genel kurallar**
- JSON alanları `snake_case` formatında olacaktır.
- ID değerleri string olarak gönderilecektir.
- Tarihler UTC ve ISO 8601 formatında olacaktır.
- Sayısal ölçümler JSON number olacaktır.
- Boş listeler `[]`, boş değerler `null` olacaktır.
- `created_at` ve `updated_at` alanları backend tarafından yönetilecektir.
- Şifre hash'leri ve cihaz anahtarı hash'leri API cevaplarında bulunmayacaktır.

**Kimlik doğrulama**

Kullanıcı işlemleri:

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Cihaz işlemleri:

```http
X-Device-Code: ULGEN-ESP32-001
X-Device-Key: DEVICE_SECRET
Content-Type: application/json
```

---

## 2. Kullanıcı işlemleri

### 2.1. Kullanıcı kaydı

**POST** `/auth/register`

Request:

```json
{
  "full_name": "Meryem Kılınç",
  "email": "meryem@example.com",
  "password": "StrongPassword123"
}
```

Response – HTTP 201:

```json
{
  "success": true,
  "message": "Kullanıcı başarıyla oluşturuldu.",
  "data": {
    "user": {
      "id": "1",
      "full_name": "Meryem Kılınç",
      "email": "meryem@example.com",
      "is_active": true,
      "created_at": "2026-11-08T12:00:00.000Z",
      "updated_at": "2026-11-08T12:00:00.000Z"
    }
  }
}
```

### 2.2. Kullanıcı girişi

**POST** `/auth/login`

Request:

```json
{
  "email": "meryem@example.com",
  "password": "StrongPassword123"
}
```

Response:

```json
{
  "success": true,
  "message": "Giriş başarılı.",
  "data": {
    "access_token": "JWT_ACCESS_TOKEN",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "1",
      "full_name": "Meryem Kılınç",
      "email": "meryem@example.com",
      "is_active": true,
      "created_at": "2026-11-08T12:00:00.000Z",
      "updated_at": "2026-11-08T12:00:00.000Z"
    }
  }
}
```

### 2.3. Kullanıcı bilgilerini getirme

**GET** `/users/me`

Response:

```json
{
  "success": true,
  "message": "Kullanıcı bilgileri getirildi.",
  "data": {
    "id": "1",
    "full_name": "Meryem Kılınç",
    "email": "meryem@example.com",
    "is_active": true,
    "created_at": "2026-11-08T12:00:00.000Z",
    "updated_at": "2026-11-08T12:00:00.000Z"
  }
}
```

---

## 3. Cihaz işlemleri

### 3.1. Cihaz ekleme

**POST** `/devices`

Request:

```json
{
  "device_code": "ULGEN-ESP32-001",
  "name": "Ülgen Akıllı Bileklik",
  "firmware_version": "1.0.0"
}
```

Response:

```json
{
  "success": true,
  "message": "Cihaz başarıyla eklendi.",
  "data": {
    "device": {
      "id": "1",
      "user_id": "1",
      "device_code": "ULGEN-ESP32-001",
      "name": "Ülgen Akıllı Bileklik",
      "battery_level": null,
      "firmware_version": "1.0.0",
      "last_seen_at": null,
      "is_active": false,
      "created_at": "2026-11-08T12:00:00.000Z",
      "updated_at": "2026-11-08T12:00:00.000Z"
    },
    "device_key": "ONE_TIME_DEVICE_SECRET"
  }
}
```

### 3.2. Kullanıcının cihazlarını listeleme

**GET** `/users/me/devices`

Response:

```json
{
  "success": true,
  "message": "Cihazlar getirildi.",
  "data": {
    "devices": [
      {
        "id": "1",
        "device_code": "ULGEN-ESP32-001",
        "name": "Ülgen Akıllı Bileklik",
        "battery_level": 85,
        "firmware_version": "1.0.0",
        "last_seen_at": "2026-11-08T12:30:00.000Z",
        "is_active": true,
        "created_at": "2026-11-08T12:00:00.000Z",
        "updated_at": "2026-11-08T12:30:00.000Z"
      }
    ]
  }
}
```

### 3.3. Cihaz durumunu güncelleme

**POST** `/device/heartbeat`

Request:

```json
{
  "battery_level": 85,
  "firmware_version": "1.0.0"
}
```

Response:

```json
{
  "success": true,
  "message": "Cihaz durumu güncellendi.",
  "data": {
    "device_id": "1",
    "battery_level": 85,
    "firmware_version": "1.0.0",
    "is_active": true,
    "last_seen_at": "2026-11-08T12:30:00.000Z",
    "created_at": "2026-11-08T12:00:00.000Z",
    "updated_at": "2026-11-08T12:30:00.000Z"
  }
}
```

---

## 4. Sensör ölçümleri

### 4.1. Sensör verisi gönderme

**POST** `/device/measurements`

Request:

```json
{
  "sample_id": "SAMPLE-000001",
  "measured_at": "2026-11-08T12:30:15.250Z",
  "heart_rate_bpm": 78.5,
  "spo2_percent": 98.0,
  "gsr_raw": 1250,
  "stress_index": 32.5,
  "movement": "walking",
  "wear_detected": true,
  "heart_rate_valid": true,
  "spo2_valid": true,
  "gsr_valid": true,
  "stress_valid": true
}
```

Response:

```json
{
  "success": true,
  "message": "Sensör verisi kaydedildi.",
  "data": {
    "measurement_id": "501",
    "device_id": "1",
    "sample_id": "SAMPLE-000001",
    "measured_at": "2026-11-08T12:30:15.250Z",
    "received_at": "2026-11-08T12:30:15.500Z"
  }
}
```

### 4.2. Son sensör verisini getirme

**GET** `/users/:id/measurements/latest`

Response:

```json
{
  "success": true,
  "message": "Son ölçüm getirildi.",
  "data": {
    "measurement": {
      "id": "501",
      "device_id": "1",
      "sample_id": "SAMPLE-000001",
      "measured_at": "2026-11-08T12:30:15.250Z",
      "received_at": "2026-11-08T12:30:15.500Z",
      "heart_rate_bpm": 78.5,
      "spo2_percent": 98.0,
      "gsr_raw": 1250,
      "stress_index": 32.5,
      "movement": "walking",
      "wear_detected": true,
      "heart_rate_valid": true,
      "spo2_valid": true,
      "gsr_valid": true,
      "stress_valid": true
    }
  }
}
```

### 4.3. Sensör geçmişini getirme

**GET** `/users/:id/measurements?start_date=2026-11-01T00:00:00.000Z&end_date=2026-11-08T23:59:59.999Z&page=1&limit=20`

Response:

```json
{
  "success": true,
  "message": "Ölçüm geçmişi getirildi.",
  "data": {
    "measurements": [
      {
        "id": "501",
        "device_id": "1",
        "sample_id": "SAMPLE-000001",
        "measured_at": "2026-11-08T12:30:15.250Z",
        "received_at": "2026-11-08T12:30:15.500Z",
        "heart_rate_bpm": 78.5,
        "spo2_percent": 98.0,
        "gsr_raw": 1250,
        "stress_index": 32.5,
        "movement": "walking",
        "wear_detected": true,
        "heart_rate_valid": true,
        "spo2_valid": true,
        "gsr_valid": true,
        "stress_valid": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

**Önemli:** `measurements` tablosunda `created_at` ve `updated_at` bulunmuyor. Bu nedenle ölçüm kayıtlarında `measured_at` ve `received_at` kullanılacaktır.

---

## 5. Sağlık özeti

### 5.1. Sağlık özetini getirme

**GET** `/users/:id/summary`

Response:

```json
{
  "success": true,
  "message": "Sağlık özeti getirildi.",
  "data": {
    "user_id": "1",
    "latest_measurement": {
      "heart_rate_bpm": 78.5,
      "spo2_percent": 98.0,
      "gsr_raw": 1250,
      "stress_index": 32.5,
      "movement": "walking",
      "measured_at": "2026-11-08T12:30:15.250Z",
      "received_at": "2026-11-08T12:30:15.500Z"
    },
    "device": {
      "id": "1",
      "name": "Ülgen Akıllı Bileklik",
      "battery_level": 85,
      "is_active": true,
      "last_seen_at": "2026-11-08T12:30:00.000Z",
      "created_at": "2026-11-08T12:00:00.000Z",
      "updated_at": "2026-11-08T12:30:00.000Z"
    },
    "active_event_count": 0
  }
}
```

---

## 6. Sağlık eşik değerleri

### 6.1. Eşik değerlerini getirme

**GET** `/users/:id/thresholds`

Response:

```json
{
  "success": true,
  "message": "Eşik değerleri getirildi.",
  "data": {
    "user_id": "1",
    "min_heart_rate_bpm": 50,
    "max_heart_rate_bpm": 120,
    "min_spo2_percent": 90,
    "fall_impact_threshold_g": 2.5,
    "stress_threshold": 70,
    "is_enabled": true,
    "created_at": "2026-11-08T12:00:00.000Z",
    "updated_at": "2026-11-08T12:00:00.000Z"
  }
}
```

### 6.2. Eşik değerlerini güncelleme

**PUT** `/users/:id/thresholds`

Request:

```json
{
  "min_heart_rate_bpm": 50,
  "max_heart_rate_bpm": 120,
  "min_spo2_percent": 90,
  "fall_impact_threshold_g": 2.5,
  "stress_threshold": 70,
  "is_enabled": true
}
```

Response:

```json
{
  "success": true,
  "message": "Eşik değerleri güncellendi.",
  "data": {
    "user_id": "1",
    "min_heart_rate_bpm": 50,
    "max_heart_rate_bpm": 120,
    "min_spo2_percent": 90,
    "fall_impact_threshold_g": 2.5,
    "stress_threshold": 70,
    "is_enabled": true,
    "created_at": "2026-11-08T12:00:00.000Z",
    "updated_at": "2026-11-08T12:40:00.000Z"
  }
}
```

---

## 7. Acil durum olayları

### 7.1. Acil durumları listeleme

**GET** `/users/:id/events?page=1&limit=20`

Response:

```json
{
  "success": true,
  "message": "Acil durum kayıtları getirildi.",
  "data": {
    "events": [
      {
        "id": "25",
        "user_id": "1",
        "device_id": "1",
        "measurement_id": "501",
        "event_key": "EVENT-000025",
        "event_type": "fall",
        "status": "pending",
        "detected_at": "2026-11-08T12:30:00.000Z",
        "countdown_seconds": 30,
        "deadline_at": "2026-11-08T12:30:30.000Z",
        "resolved_at": null,
        "resolution_reason": null,
        "created_at": "2026-11-08T12:30:00.000Z",
        "updated_at": "2026-11-08T12:30:00.000Z"
      }
    ]
  }
}
```

Olası `event_type` değerleri:

- `fall`
- `high_heart_rate`
- `low_heart_rate`
- `low_spo2`
- `high_stress`

Olası `status` değerleri:

- `pending`
- `cancelled`
- `escalated`
- `resolved`

### 7.2. Acil durum geri sayımını iptal etme

**PUT** `/events/:id`

Request:

```json
{
  "action": "cancel",
  "resolution_reason": "Kullanıcı güvende olduğunu onayladı."
}
```

Response:

```json
{
  "success": true,
  "message": "Acil durum geri sayımı iptal edildi.",
  "data": {
    "id": "25",
    "status": "cancelled",
    "resolved_at": "2026-11-08T12:30:10.000Z",
    "resolution_reason": "Kullanıcı güvende olduğunu onayladı.",
    "created_at": "2026-11-08T12:30:00.000Z",
    "updated_at": "2026-11-08T12:30:10.000Z"
  }
}
```

Geri sayım backend tarafından yönetilmelidir. Mobil uygulama kapalı olsa bile sunucu süreyi takip etmeli ve gerekli bildirimleri göndermelidir.

---

## 8. Acil durum kişileri

### 8.1. Kişileri listeleme

**GET** `/users/:id/contacts`

Response:

```json
{
  "success": true,
  "message": "Acil durum kişileri getirildi.",
  "data": {
    "contacts": [
      {
        "id": "10",
        "user_id": "1",
        "linked_user_id": "2",
        "full_name": "Ahmet Yılmaz",
        "phone_number": "+905551112233",
        "priority": 1,
        "is_active": true,
        "phone_verified_at": null,
        "created_at": "2026-11-08T12:00:00.000Z",
        "updated_at": "2026-11-08T12:00:00.000Z"
      }
    ]
  }
}
```

### 8.2. Acil durum kişisi ekleme

**POST** `/users/:id/contacts`

Request:

```json
{
  "linked_user_id": null,
  "full_name": "Ahmet Yılmaz",
  "phone_number": "+905551112233",
  "priority": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Acil durum kişisi eklendi.",
  "data": {
    "id": "10",
    "user_id": "1",
    "linked_user_id": null,
    "full_name": "Ahmet Yılmaz",
    "phone_number": "+905551112233",
    "priority": 1,
    "is_active": true,
    "phone_verified_at": null,
    "created_at": "2026-11-08T12:00:00.000Z",
    "updated_at": "2026-11-08T12:00:00.000Z"
  }
}
```

### 8.3. Acil durum kişisini pasifleştirme

**DELETE** `/users/:id/contacts/:contactId`

Response:

```json
{
  "success": true,
  "message": "Acil durum kişisi pasifleştirildi.",
  "data": {
    "id": "10",
    "is_active": false,
    "created_at": "2026-11-08T12:00:00.000Z",
    "updated_at": "2026-11-08T13:00:00.000Z"
  }
}
```

---

## 9. Kullanıcılar arası erişim izinleri

### 9.1. Erişim isteği gönderme

**POST** `/users/:id/access`

Request:

```json
{
  "viewer_id": "2"
}
```

Response:

```json
{
  "success": true,
  "message": "Erişim isteği gönderildi.",
  "data": {
    "id": "15",
    "owner_id": "1",
    "viewer_id": "2",
    "status": "pending",
    "created_at": "2026-11-08T12:45:00.000Z",
    "updated_at": "2026-11-08T12:45:00.000Z",
    "accepted_at": null,
    "revoked_at": null
  }
}
```

### 9.2. Erişim izinlerini listeleme

**GET** `/me/access`

Response:

```json
{
  "success": true,
  "message": "Erişim izinleri getirildi.",
  "data": {
    "incoming": [
      {
        "id": "15",
        "owner_id": "1",
        "viewer_id": "2",
        "status": "pending",
        "created_at": "2026-11-08T12:45:00.000Z",
        "updated_at": "2026-11-08T12:45:00.000Z",
        "accepted_at": null,
        "revoked_at": null
      }
    ],
    "outgoing": []
  }
}
```

### 9.3. İsteği kabul etme veya reddetme

**PUT** `/access/:id`

Kabul request:

```json
{
  "action": "accept"
}
```

Reddetme request:

```json
{
  "action": "reject"
}
```

Response:

```json
{
  "success": true,
  "message": "Erişim isteği güncellendi.",
  "data": {
    "id": "15",
    "owner_id": "1",
    "viewer_id": "2",
    "status": "accepted",
    "created_at": "2026-11-08T12:45:00.000Z",
    "updated_at": "2026-11-08T12:50:00.000Z",
    "accepted_at": "2026-11-08T12:50:00.000Z",
    "revoked_at": null
  }
}
```

### 9.4. Erişim iznini iptal etme

**DELETE** `/access/:id`

Response:

```json
{
  "success": true,
  "message": "Erişim izni iptal edildi.",
  "data": {
    "id": "15",
    "owner_id": "1",
    "viewer_id": "2",
    "status": "revoked",
    "created_at": "2026-11-08T12:45:00.000Z",
    "updated_at": "2026-11-08T13:00:00.000Z",
    "accepted_at": "2026-11-08T12:50:00.000Z",
    "revoked_at": "2026-11-08T13:00:00.000Z"
  }
}
```

---

## 10. Push bildirim token işlemleri

### 10.1. Bildirim tokenı kaydetme

**POST** `/me/push-tokens`

Request:

```json
{
  "provider": "fcm",
  "platform": "android",
  "installation_id": "APP-INSTALLATION-001",
  "token": "FCM_DEVICE_TOKEN"
}
```

Response:

```json
{
  "success": true,
  "message": "Bildirim tokenı kaydedildi.",
  "data": {
    "id": "30",
    "user_id": "1",
    "provider": "fcm",
    "platform": "android",
    "installation_id": "APP-INSTALLATION-001",
    "is_active": true,
    "created_at": "2026-11-08T12:00:00.000Z",
    "updated_at": "2026-11-08T12:00:00.000Z",
    "last_registered_at": "2026-11-08T12:00:00.000Z",
    "last_used_at": null,
    "revoked_at": null
  }
}
```

### 10.2. Tokenı pasifleştirme

**DELETE** `/me/push-tokens/:id`

Response:

```json
{
  "success": true,
  "message": "Bildirim tokenı pasifleştirildi.",
  "data": {
    "id": "30",
    "is_active": false,
    "created_at": "2026-11-08T12:00:00.000Z",
    "updated_at": "2026-11-08T13:00:00.000Z",
    "last_registered_at": "2026-11-08T12:00:00.000Z",
    "last_used_at": null,
    "revoked_at": "2026-11-08T13:00:00.000Z"
  }
}
```

---

## 11. Bildirim işlemleri

### 11.1. Bildirimleri listeleme

**GET** `/users/me/notifications?page=1&limit=20`

Response:

```json
{
  "success": true,
  "message": "Bildirimler getirildi.",
  "data": {
    "notifications": [
      {
        "id": "100",
        "event_id": "25",
        "recipient_user_id": "1",
        "recipient_contact_id": null,
        "title": "Acil Durum Uyarısı",
        "message": "Acil durum algılandı.",
        "type": "emergency",
        "channel": "push",
        "status": "sent",
        "sent_at": "2026-11-08T12:31:00.000Z",
        "read_at": null,
        "provider_message_id": "FCM-MESSAGE-001"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

**Not:** `notifications` tablosunda `created_at` ve `updated_at` alanları bulunmamaktadır. Bu nedenle cevapta da bulunmayacaktır.

### 11.2. Bildirimi okundu olarak işaretleme

**PUT** `/notifications/:id/read`

Request:

```json
{}
```

Response:

```json
{
  "success": true,
  "message": "Bildirim okundu olarak işaretlendi.",
  "data": {
    "id": "100",
    "read_at": "2026-11-08T12:35:00.000Z"
  }
}
```

---

## 12. HTTP durum kodları

| Kod | Açıklama |
|---|---|
| 200 | İşlem başarılı |
| 201 | Yeni kayıt oluşturuldu |
| 400 | Hatalı istek |
| 401 | Kimlik doğrulama gerekli |
| 403 | Erişim izni yok |
| 404 | Kayıt bulunamadı |
| 409 | Mükerrer kayıt veya çakışma |
| 422 | Veri doğrulama hatası |
| 500 | Sunucu hatası |

### Örnek hata cevabı

```json
{
  "success": false,
  "message": "Bu veriye erişim izniniz bulunmuyor.",
  "error": {
    "code": "FORBIDDEN",
    "details": null
  }
}
```

---

## 13. Tarih alanları için ortak kurallar

| Alan | Anlamı | Yönetimi |
|---|---|---|
| `created_at` | Kayıt oluşturulma zamanı | Backend / veritabanı |
| `updated_at` | Son güncellenme zamanı | Backend / veritabanı |
| `measured_at` | Ölçümün gerçekleştiği zaman | ESP32 gönderir |
| `received_at` | Ölçümün sunucuya ulaştığı zaman | Backend |
| `last_seen_at` | Cihazın son bağlantı zamanı | Backend |
| `detected_at` | Olayın algılandığı zaman | Backend veya güvenilir cihaz olayı |
| `deadline_at` | Geri sayımın bitiş zamanı | Backend |
| `resolved_at` | Olayın sonuçlandırıldığı zaman | Backend |
| `accepted_at` | Erişim izninin kabul edildiği zaman | Backend |
| `revoked_at` | Erişim izninin iptal edildiği zaman | Backend |
| `last_registered_at` | Push tokenının son kayıt zamanı | Backend |
| `last_used_at` | Push tokenının son kullanım zamanı | Backend |
| `sent_at` | Bildirimin gönderilme zamanı | Backend |
| `read_at` | Bildirimin okunma zamanı | Backend |

**Önemli:** Request JSON içerisinde `created_at`, `updated_at` veya backend tarafından yönetilen diğer zaman alanları istemciden kabul edilmemelidir. Bu değerleri sunucu üretmelidir. İstisna olarak ESP32'nin ölçüm zamanı `measured_at` cihazdan gelir.

---

## 14. Backend geliştirme sırası

| Öncelik | İşlem |
|---|---|
| 1 | Kullanıcı kayıt ve giriş |
| 2 | JWT doğrulama |
| 3 | Cihaz ekleme ve doğrulama |
| 4 | ESP32 sensör verisi gönderme |
| 5 | Son sensör verisini getirme |
| 6 | Sağlık özeti ve ölçüm geçmişi |
| 7 | Eşik değerleri |
| 8 | Acil durum ve geri sayım |
| 9 | Acil kişiler ve erişim izinleri |
| 10 | Push bildirimleri |

**Son not:** Bu dokümandaki örnekler önerilen API sözleşmesidir. Endpoint adları ve iş kuralları backend geliştiricisiyle birlikte kesinleştirilmelidir. Veritabanında olmayan bir alan, mevcut tabloya aitmiş gibi API cevabına eklenmemelidir.