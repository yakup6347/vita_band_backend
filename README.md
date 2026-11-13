# ÜLGEN - Akıllı Sağlık Bilekliği Backend API (v1.1)

**ÜLGEN** IoT akıllı sağlık bilekliği projesinin Node.js (Saf JavaScript ES Modules) + Express + MySQL (`mysql2/promise`) tabanlı backend servisidir. Veritabanı şeması [schema.sql](file:///home/teknogt/Masaüstü/Yakup/iot/vita_band_backend/schema.sql) ve API sözleşmesi [endpoint.md](file:///home/teknogt/Masaüstü/Yakup/iot/vita_band_backend/endpoint.md) esas alınarak geliştirilmiştir.

## Teknoloji Yığını

- **Runtime:** Node.js (v18+)
- **Dil:** Saf JavaScript (ES Modules)
- **Web Framework:** Express.js
- **Veritabanı:** MySQL 8+ (`mysql2/promise`, tüm bağlantılarda `SET time_zone = '+00:00'`)
- **Kimlik Doğrulama:** Kullanıcılar için JWT (`Authorization: Bearer`), cihazlar için `X-Device-Code` + `X-Device-Key` (bcrypt hash)

## Kurulum ve Çalıştırma

```bash
npm install
cp .env.example .env
# .env içindeki DB_* ve JWT_SECRET değerlerini düzenleyin
mysql -u root -p -e "CREATE DATABASE ulgen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p ulgen < database/schema.sql
npm start
```

Varsayılan Base URL: `http://localhost:3000/api/v1`

## Swagger / OpenAPI Dokümantasyonu

Sunucu çalışırken tarayıcı üzerinden Swagger UI sayfasına erişebilirsiniz:

- Swagger UI: `http://localhost:3000/api-docs` (alternatif: `http://localhost:3000/api/v1/docs`)
- OpenAPI 3.0 JSON: `http://localhost:3000/api-docs.json`

## Test

```bash
npm test
```

## Başlıca Endpoint'ler

- **Kimlik Doğrulama & Kullanıcı:** `POST /auth/register`, `POST /auth/login`, `GET /users/me`
- **Cihaz:** `POST /devices`, `GET /users/me/devices`, `POST /device/heartbeat`
- **Ölçüm & Özet:** `POST /device/measurements`, `GET /users/:id/measurements/latest`, `GET /users/:id/measurements`, `GET /users/:id/summary`
- **Eşik Değerleri:** `GET /users/:id/thresholds`, `PUT /users/:id/thresholds`
- **Acil Durumlar:** `GET /users/:id/events`, `PUT /events/:id`
- **Acil Kişiler:** `GET /users/:id/contacts`, `POST /users/:id/contacts`, `DELETE /users/:id/contacts/:contactId`
- **Erişim İzinleri:** `POST /users/:id/access`, `GET /me/access`, `PUT /access/:id`, `DELETE /access/:id`
- **Push Token & Bildirim:** `POST /me/push-tokens`, `DELETE /me/push-tokens/:id`, `GET /users/me/notifications`, `PUT /notifications/:id/read`
