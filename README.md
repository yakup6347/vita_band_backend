# 🩺 Vita Band - IoT Akıllı Sağlık Bilekliği Backend API

Bu proje, **Vita Band** IoT akıllı sağlık bilekliği projesinin backend servisidir. 
Bileklikten Bluetooth (BLE) aracılığıyla Flutter mobil uygulamasına aktarılan sağlık telemetri verilerini (nabız, kandaki oksijen, vücut sıcaklığı, adım sayısı, ivmeölçer, düşme algılama vb.) REST API üzerinden toplar, **MySQL** veritabanına doğrudan SQL sorguları (`mysql2`) ile kaydeder, sağlık eşik analizleri yapar ve acil durum uyarıları üretir.

---

## 🛠️ Teknoloji Yığını

- **Çalışma Zamanı (Runtime):** Node.js (v20+)
- **Dil:** Saf JavaScript (ES Modules: `import / export`)
- **Web Framework:** Express.js
- **Veritabanı Sürücüsü:** `mysql2/promise` (Bağlantı Havuzu & Düz SQL Sorguları)
- **Kimlik Doğrulama:** JWT (JSON Web Tokens) & Bcryptjs
- **Güvenlik & Loglama:** Helmet, CORS, Morgan

---

## 📂 Dosya ve Dizin Yapısı

```text
vita_band_backend/
├── schema.sql                # MySQL veritabanı tabloları oluşturma betiği (CREATE TABLE ...)
├── src/
│   ├── config/               # Konfigürasyon
│   │   ├── db.js             # MySQL bağlantı havuzu (mysql2 pool) ve bağlantı testi
│   │   └── env.js            # .env değişkenlerinin okunması
│   ├── constants/            # Sağlık sınırları ve HTTP durum kodları
│   │   └── index.js          # Nabız, SpO2, ateş limitleri
│   ├── controllers/          # HTTP isteklerini karşılayan kontrolcüler
│   │   ├── alert.controller.js    # Acil durum ve uyarılar
│   │   ├── auth.controller.js     # Kullanıcı kayıt ve giriş
│   │   ├── device.controller.js   # Bileklik eşleştirme ve durum
│   │   ├── telemetry.controller.js# Sensör telemetri ölçümleri
│   │   └── user.controller.js     # Profil işlemleri
│   ├── middlewares/          # Ara katman yazılımları
│   │   ├── auth.middleware.js     # JWT doğrulama kontrolü
│   │   └── error.middleware.js    # Global hata yakalama
│   ├── routes/               # API rotaları (/api/v1)
│   │   ├── alert.routes.js
│   │   ├── auth.routes.js
│   │   ├── device.routes.js
│   │   ├── index.js          # Tüm rotaların toplandığı ana yönlendirici
│   │   ├── telemetry.routes.js
│   │   └── user.routes.js
│   ├── services/             # Veritabanı sorguları (Düz SQL) ve iş mantığı
│   │   ├── alert.service.js       # INSERT/SELECT alerts
│   │   ├── auth.service.js        # INSERT/SELECT users
│   │   ├── device.service.js      # INSERT/UPDATE devices
│   │   ├── telemetry.service.js   # INSERT/SELECT telemetries & eşik kontrolü
│   │   └── user.service.js        # SELECT/UPDATE users
│   ├── utils/                # Yardımcı araçlar
│   │   ├── apiResponse.js    # Standart JSON yanıt formatı
│   │   ├── jwt.js            # JWT token üretici/doğrulayıcı
│   │   └── password.js       # Şifre hashleme (bcrypt)
│   ├── app.js                # Express uygulama yapılandırması
│   └── server.js             # Sunucu başlatıcı (Entry point)
├── .env.example              # Örnek çevre değişkenleri
├── .env                      # Ortam değişkenleri
├── .gitignore
├── package.json
└── README.md
```

---

## ⚡ Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Ortam Değişkenlerini Yapılandırın
`.env.example` dosyasını referans alarak `.env` dosyasını oluşturun veya düzenleyin:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sizin_sifreniz
DB_NAME=vita_band_db

JWT_SECRET=super_gizli_anahtar
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

### 3. MySQL Tablolarını Oluşturma
Ekip arkadaşınızın veya sizin MySQL sunucunuzda tabloları hazır hale getirmek için proje kökündeki `schema.sql` dosyasını MySQL Workbench, phpMyAdmin veya terminal üzerinden çalıştırabilirsiniz:
```bash
mysql -u root -p < schema.sql
```

### 4. Sunucuyu Çalıştırma
Node.js 20'nin dahili izleme modu ile dosya değişikliklerinde otomatik yeniden başlar:
```bash
npm run dev
```
Sunucu: `http://localhost:5000`

---

## 📡 API Endpoint Listesi

Tüm API uç noktaları `/api/v1` ön eki ile başlar.

### 🔐 Kimlik Doğrulama (`/api/v1/auth`)
| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Yeni kullanıcı kaydı |
| `POST` | `/api/v1/auth/login` | Giriş yapıp JWT token alma |

### ⌚ Cihaz Yönetimi (`/api/v1/devices`)
| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/v1/devices/pair` | BLE bilekliği kullanıcıyla eşleştirme |
| `GET` | `/api/v1/devices` | Kullanıcının cihazlarını listeleme |
| `GET` | `/api/v1/devices/:id` | Cihaz detayı ve son ölçüm bilgisi |
| `PATCH` | `/api/v1/devices/:id` | Cihaz adı veya durumunu güncelleme |

### 📊 Sensör Telemetrisi (`/api/v1/telemetry`)
*(Flutter uygulaması BLE üzerinden okuduğu sağlık verilerini buraya iletir)*

| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/v1/telemetry` | Anlık tekil sensör ölçümü kaydetme |
| `POST` | `/api/v1/telemetry/batch` | Birikmiş ölçümleri toplu kaydetme |
| `GET` | `/api/v1/telemetry/:deviceId/history` | Ölçüm geçmişini filtreleyip alma |

#### Örnek Telemetri Gönderimi (POST /api/v1/telemetry):
```json
{
  "macAddress": "AA:BB:CC:11:22:33",
  "heartRate": 82.0,
  "spo2": 97.5,
  "temperature": 36.6,
  "stepCount": 3200,
  "calories": 145.0,
  "fallDetected": false,
  "batteryLevel": 90,
  "recordedAt": "2026-11-07T14:30:00.000Z"
}
```

### 🚨 Acil Durum & Uyarılar (`/api/v1/alerts`)
*(Düşme veya kritik nabız gibi durumlarda telemetri servisi tarafından otomatik tetiklenir veya panik butonu ile manuel açılır)*

| Metot | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/v1/alerts` | Aktif / çözülmüş uyarıları listeleme |
| `POST` | `/api/v1/alerts` | Manuel panik butonu / acil durum uyarısı |
| `PATCH` | `/api/v1/alerts/:id/resolve` | Uyarıyı çözüldü olarak işaretleme |
