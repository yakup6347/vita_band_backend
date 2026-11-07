# 🩺 Vita Band - IoT Akıllı Sağlık Bilekliği Backend API

Bu proje, **Vita Band** IoT akıllı sağlık bilekliği projesinin backend servisidir. 
Bileklikten Bluetooth (BLE) aracılığıyla Flutter mobil uygulamasına aktarılan sağlık telemetri verilerini (nabız, kandaki oksijen, vücut sıcaklığı, adım, düşme algılama vb.) REST API üzerinden toplar, MySQL veritabanında saklar, eşik değer analizleri yapar ve acil durum uyarıları üretir.

---

## 🛠️ Teknoloji Yığını

- **Çalışma Zamanı (Runtime):** Node.js (v20+)
- **Dil:** TypeScript
- **Web Framework:** Express.js
- **Veritabanı & ORM:** MySQL & Prisma ORM
- **Doğrulama (Validation):** Zod
- **Kimlik Doğrulama:** JWT (JSON Web Tokens) & Bcryptjs
- **Güvenlik & Loglama:** Helmet, CORS, Morgan

---

## 📂 Dosya ve Dizin Yapısı

```text
vita_band_backend/
├── prisma/
│   └── schema.prisma         # Veritabanı modelleri (User, Device, Telemetry, Alert)
├── src/
│   ├── config/               # Yapılandırma dosyaları
│   │   ├── database.ts       # Prisma MySQL bağlantı yöneticisi
│   │   └── env.ts            # Çevre değişkenleri ve tipleri
│   ├── constants/            # Sabitler ve sağlık eşik değerleri (nabız, SpO2 limitleri)
│   │   └── index.ts
│   ├── controllers/          # HTTP isteklerini karşılayan kontrolcüler
│   │   ├── alert.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── device.controller.ts
│   │   ├── telemetry.controller.ts
│   │   └── user.controller.ts
│   ├── middlewares/          # Ara katman yazılımları
│   │   ├── auth.middleware.ts     # JWT yetkilendirme
│   │   ├── error.middleware.ts    # Merkezi hata yakalayıcı (Global Error Handler)
│   │   └── validate.middleware.ts # Zod şema doğrulayıcı
│   ├── routes/               # API rotaları (/api/v1)
│   │   ├── alert.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── device.routes.ts
│   │   ├── index.ts          # Ana router toplayıcısı
│   │   ├── telemetry.routes.ts
│   │   └── user.routes.ts
│   ├── services/             # İş mantığı (Business Logic) katmanı
│   │   ├── alert.service.ts
│   │   ├── auth.service.ts
│   │   ├── device.service.ts
│   │   ├── telemetry.service.ts
│   │   └── user.service.ts
│   ├── types/                # TypeScript interface ve tip tanımları
│   │   └── index.ts
│   ├── utils/                # Yardımcı fonksiyonlar
│   │   ├── apiResponse.ts    # Standart JSON yanıt formatlayıcı
│   │   ├── jwt.ts            # Token üretme ve doğrulama
│   │   └── password.ts       # Şifre hashleme ve kontrol
│   ├── validators/           # Zod istek doğrulama şemaları
│   │   ├── alert.validator.ts
│   │   ├── auth.validator.ts
│   │   ├── device.validator.ts
│   │   └── telemetry.validator.ts
│   ├── app.ts                # Express uygulama yapılandırması
│   └── server.ts             # Sunucu başlatıcı (Entry point)
├── .env.example              # Örnek ortam değişkenleri
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚡ Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Ortam Değişkenlerini Yapılandırın
`.env.example` dosyasını kopyalayıp `.env` dosyasını oluşturun veya düzenleyin:
```bash
cp .env.example .env
```
`.env` içerisindeki `DATABASE_URL` değerini kendi MySQL bağlantınıza göre güncelleyin:
```env
DATABASE_URL="mysql://root:sifreniz@localhost:3306/vita_band_db"
PORT=5000
JWT_SECRET="guclu_bir_jwt_gizli_anahtari"
```

### 3. MySQL Veritabanı Entegrasyonu

Ekip arkadaşınız MySQL veritabanını hazırladığında iki senaryoyu kullanabilirsiniz:

- **Senaryo A (Hazır şemayı MySQL'e aktarmak için):**
  ```bash
  npm run prisma:push
  ```
- **Senaryo B (Arkadaşınızın MySQL tablolarını koda çekmek için):**
  Arkadaşınız tabloları oluşturduysa tek yapmanız gereken:
  ```bash
  npm run prisma:pull
  npm run prisma:generate
  ```
- **Veritabanını Arayüzden Görüntülemek için:**
  ```bash
  npm run prisma:studio
  ```

### 4. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```
Sunucu varsayılan olarak `http://localhost:5000` adresinde başlayacaktır.

---

## 📡 API Endpoint Listesi

Tüm API uç noktaları `/api/v1` ön eki ile başlar.

### 🔐 Kimlik Doğrulama (`/api/v1/auth`)
| Metot | Endpoint | Açıklama | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Yeni kullanıcı kaydı | Hayır |
| `POST` | `/api/v1/auth/login` | Kullanıcı girişi (JWT token döner) | Hayır |

### 👤 Kullanıcı İşlemleri (`/api/v1/users`)
| Metot | Endpoint | Açıklama | Auth |
|---|---|---|---|
| `GET` | `/api/v1/users/profile` | Profil bilgilerini ve eşli cihazları getirir | Evet |
| `PATCH` | `/api/v1/users/profile` | Profil bilgilerini günceller | Evet |

### ⌚ Cihaz / Bileklik Yönetimi (`/api/v1/devices`)
| Metot | Endpoint | Açıklama | Auth |
|---|---|---|---|
| `POST` | `/api/v1/devices/pair` | BLE bilekliği kullanıcıyla eşleştirir | Evet |
| `GET` | `/api/v1/devices` | Kullanıcının eşli cihazlarını listeler | Evet |
| `GET` | `/api/v1/devices/:id` | Cihaz detayını ve son ölçümü getirir | Evet |
| `PATCH` | `/api/v1/devices/:id` | Cihaz durumunu / adını günceller | Evet |

### 📊 Sensör Telemetrisi (`/api/v1/telemetry`)
*(Flutter mobil uygulaması BLE üzerinden okuduğu verileri bu endpoint'e gönderir)*

| Metot | Endpoint | Açıklama | Auth |
|---|---|---|---|
| `POST` | `/api/v1/telemetry` | Tekil anlık sensör ölçümü kaydeder | Evet |
| `POST` | `/api/v1/telemetry/batch` | Çevrimdışı birikmiş ölçümleri toplu yükler | Evet |
| `GET` | `/api/v1/telemetry/:deviceId/history` | Ölçüm geçmişini filtreleyip getirir | Evet |

#### Örnek Telemetri POST İsteği Body:
```json
{
  "macAddress": "AA:BB:CC:11:22:33",
  "heartRate": 78.5,
  "spo2": 98.2,
  "temperature": 36.6,
  "stepCount": 4520,
  "calories": 185.4,
  "fallDetected": false,
  "batteryLevel": 85,
  "recordedAt": "2026-11-07T14:30:00.000Z"
}
```

### 🚨 Acil Durum & Uyarılar (`/api/v1/alerts`)
*(Düşme, aşırı yüksek/düşük nabız, kritik SpO2 gibi durumlar otomatik olarak veya panik butonu ile tetiklenir)*

| Metot | Endpoint | Açıklama | Auth |
|---|---|---|---|
| `GET` | `/api/v1/alerts` | Kullanıcının alarmlarını listeler (`?resolved=false`) | Evet |
| `POST` | `/api/v1/alerts` | Manuel acil durum / panik butonu uyarısı oluşturur | Evet |
| `PATCH` | `/api/v1/alerts/:id/resolve` | Alarmı çözüldü olarak işaretler | Evet |
