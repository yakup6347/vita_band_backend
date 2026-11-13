import { env } from './env.js';

const errorResponseRef = {
  description: 'Hata cevabı',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const jsonContent = (schema, example) => ({
  'application/json': {
    schema,
    ...(example !== undefined ? { example } : {}),
  },
});

const successSchema = (dataSchema) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: dataSchema,
  },
});

const idParam = (name = 'id', description = 'Kayıt kimliği') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', example: '1' },
});

const paginationParams = [
  {
    name: 'page',
    in: 'query',
    required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  {
    name: 'limit',
    in: 'query',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
];

const deviceSecurity = [{ deviceCodeAuth: [], deviceKeyAuth: [] }];
const bearerSecurity = [{ bearerAuth: [] }];

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ÜLGEN IoT Akıllı Sağlık Bilekliği Backend API',
    version: '1.1.0',
    description:
      'ÜLGEN (ESP32 → Flutter → Node.js Express → MySQL) akıllı sağlık bilekliği backend servisi OpenAPI 3.0 dokümantasyonu.',
  },
  servers: [
    {
      url: '/',
      description: 'Aktif Sunucu',
    },
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Yerel Geliştirme Sunucusu',
    },
  ],
  tags: [
    { name: 'Health', description: 'Servis sağlık kontrolü' },
    { name: 'Auth', description: 'Kullanıcı kayıt ve JWT giriş işlemleri' },
    { name: 'Users', description: 'Kullanıcı profil işlemleri' },
    { name: 'Devices', description: 'Bileklik eşleştirme ve heartbeat işlemleri' },
    { name: 'Measurements', description: 'Sensör verisi gönderme, son ölçüm, geçmiş ve sağlık özeti' },
    { name: 'Thresholds', description: 'Kişisel sağlık eşik değerleri' },
    { name: 'Events', description: 'Acil durum olayları ve geri sayım yönetimi' },
    { name: 'Contacts', description: 'Acil durum kişileri' },
    { name: 'Access', description: 'Kullanıcılar arası veri görüntüleme izinleri' },
    { name: 'PushTokens', description: 'Mobil uygulama push bildirim tokenları' },
    { name: 'Notifications', description: 'Bildirim listeleme ve okundu işaretleme' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Kullanıcı işlemleri için JWT Access Token (Authorization: Bearer <token>)',
      },
      deviceCodeAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Device-Code',
        description: 'Cihaz kodu (örn: ULGEN-ESP32-001)',
      },
      deviceKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Device-Key',
        description: 'Cihaz oluşturulduğunda verilen tek seferlik gizli anahtar',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'İşlem gerçekleştirilemedi.' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              details: { nullable: true, example: null },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 1 },
          total_pages: { type: 'integer', example: 1 },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1' },
          full_name: { type: 'string', example: 'Meryem Kılınç' },
          email: { type: 'string', format: 'email', example: 'meryem@example.com' },
          is_active: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time', example: '2026-11-08T12:00:00.000Z' },
          updated_at: { type: 'string', format: 'date-time', example: '2026-11-08T12:00:00.000Z' },
        },
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1' },
          user_id: { type: 'string', example: '1' },
          device_code: { type: 'string', example: 'ULGEN-ESP32-001' },
          name: { type: 'string', example: 'Ülgen Akıllı Bileklik' },
          battery_level: { type: 'integer', nullable: true, example: 85 },
          firmware_version: { type: 'string', nullable: true, example: '1.0.0' },
          last_seen_at: { type: 'string', format: 'date-time', nullable: true },
          is_active: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Measurement: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '501' },
          device_id: { type: 'string', example: '1' },
          sample_id: { type: 'string', example: 'SAMPLE-000001' },
          measured_at: { type: 'string', format: 'date-time', example: '2026-11-08T12:30:15.250Z' },
          received_at: { type: 'string', format: 'date-time', example: '2026-11-08T12:30:15.500Z' },
          heart_rate_bpm: { type: 'number', nullable: true, example: 78.5 },
          spo2_percent: { type: 'number', nullable: true, example: 98.0 },
          gsr_raw: { type: 'integer', nullable: true, example: 1250 },
          stress_index: { type: 'number', nullable: true, example: 32.5 },
          movement: { type: 'string', example: 'walking' },
          wear_detected: { type: 'boolean', nullable: true, example: true },
          heart_rate_valid: { type: 'boolean', example: true },
          spo2_valid: { type: 'boolean', example: true },
          gsr_valid: { type: 'boolean', example: true },
          stress_valid: { type: 'boolean', example: true },
        },
      },
      LastValidMeasurement: {
        type: 'object',
        properties: {
          heart_rate_bpm: {
            nullable: true,
            type: 'object',
            properties: {
              value: { type: 'number', example: 78.5 },
              measured_at: { type: 'string', format: 'date-time' },
            },
          },
          spo2_percent: {
            nullable: true,
            type: 'object',
            properties: {
              value: { type: 'number', example: 98.0 },
              measured_at: { type: 'string', format: 'date-time' },
            },
          },
          gsr_raw: {
            nullable: true,
            type: 'object',
            properties: {
              value: { type: 'integer', example: 1250 },
              measured_at: { type: 'string', format: 'date-time' },
            },
          },
          stress_index: {
            nullable: true,
            type: 'object',
            properties: {
              value: { type: 'number', example: 32.5 },
              measured_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      Threshold: {
        type: 'object',
        properties: {
          user_id: { type: 'string', example: '1' },
          min_heart_rate_bpm: { type: 'number', nullable: true, example: 50 },
          max_heart_rate_bpm: { type: 'number', nullable: true, example: 120 },
          min_spo2_percent: { type: 'number', nullable: true, example: 90 },
          fall_impact_threshold_g: { type: 'number', nullable: true, example: 2.5 },
          stress_threshold: { type: 'number', nullable: true, example: 70 },
          is_enabled: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '25' },
          user_id: { type: 'string', example: '1' },
          device_id: { type: 'string', example: '1' },
          measurement_id: { type: 'string', nullable: true, example: '501' },
          event_key: { type: 'string', example: 'SAMPLE-000001-fall' },
          event_type: {
            type: 'string',
            enum: ['fall', 'high_heart_rate', 'low_heart_rate', 'low_spo2', 'high_stress'],
          },
          status: {
            type: 'string',
            enum: ['pending', 'cancelled', 'escalated', 'resolved'],
          },
          detected_at: { type: 'string', format: 'date-time' },
          countdown_seconds: { type: 'integer', example: 30 },
          deadline_at: { type: 'string', format: 'date-time' },
          resolved_at: { type: 'string', format: 'date-time', nullable: true },
          resolution_reason: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '10' },
          user_id: { type: 'string', example: '1' },
          linked_user_id: { type: 'string', nullable: true, example: '2' },
          full_name: { type: 'string', example: 'Ahmet Yılmaz' },
          phone_number: { type: 'string', nullable: true, example: '+905551112233' },
          priority: { type: 'integer', example: 1 },
          is_active: { type: 'boolean', example: true },
          phone_verified_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      AccessPermission: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '15' },
          owner_id: { type: 'string', example: '1' },
          viewer_id: { type: 'string', example: '2' },
          status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'revoked'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          accepted_at: { type: 'string', format: 'date-time', nullable: true },
          revoked_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      PushToken: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '30' },
          user_id: { type: 'string', example: '1' },
          provider: { type: 'string', example: 'fcm' },
          platform: { type: 'string', enum: ['android', 'ios'], example: 'android' },
          installation_id: { type: 'string', example: 'APP-INSTALLATION-001' },
          is_active: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          last_registered_at: { type: 'string', format: 'date-time' },
          last_used_at: { type: 'string', format: 'date-time', nullable: true },
          revoked_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '100' },
          event_id: { type: 'string', example: '25' },
          recipient_user_id: { type: 'string', nullable: true, example: '1' },
          recipient_contact_id: { type: 'string', nullable: true, example: null },
          title: { type: 'string', example: 'Acil Durum Uyarısı' },
          message: { type: 'string', example: 'Acil durum algılandı.' },
          type: { type: 'string', enum: ['countdown', 'emergency'] },
          channel: { type: 'string', enum: ['push', 'sms'] },
          status: {
            type: 'string',
            enum: ['queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled'],
          },
          sent_at: { type: 'string', format: 'date-time', nullable: true },
          read_at: { type: 'string', format: 'date-time', nullable: true },
          provider_message_id: { type: 'string', nullable: true },
        },
      },
    },
  },
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Servis sağlık kontrolü',
        responses: {
          200: {
            description: 'Servis çalışıyor',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  project: { type: 'string' },
                  version: { type: 'string', example: '1.1.0' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              })
            ),
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Kullanıcı kaydı',
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['full_name', 'email', 'password'],
            properties: {
              full_name: { type: 'string', example: 'Meryem Kılınç' },
              email: { type: 'string', format: 'email', example: 'meryem@example.com' },
              password: { type: 'string', minLength: 6, example: 'StrongPassword123' },
            },
          }),
        },
        responses: {
          201: {
            description: 'Kullanıcı oluşturuldu',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: { user: { $ref: '#/components/schemas/User' } },
              })
            ),
          },
          409: errorResponseRef,
          422: errorResponseRef,
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Kullanıcı girişi',
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', example: 'meryem@example.com' },
              password: { type: 'string', example: 'StrongPassword123' },
            },
          }),
        },
        responses: {
          200: {
            description: 'Giriş başarılı',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  access_token: { type: 'string' },
                  token_type: { type: 'string', example: 'Bearer' },
                  expires_in: { type: 'integer', example: 3600 },
                  user: { $ref: '#/components/schemas/User' },
                },
              })
            ),
          },
          401: errorResponseRef,
        },
      },
    },
    '/api/v1/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Giriş yapan kullanıcının bilgilerini getirme',
        security: bearerSecurity,
        responses: {
          200: {
            description: 'Kullanıcı bilgileri',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/User' })),
          },
          401: errorResponseRef,
        },
      },
    },
    '/api/v1/devices': {
      post: {
        tags: ['Devices'],
        summary: 'Yeni cihaz ekleme (tek seferlik device_key üretir)',
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['device_code', 'name'],
            properties: {
              device_code: { type: 'string', example: 'ULGEN-ESP32-001' },
              name: { type: 'string', example: 'Ülgen Akıllı Bileklik' },
              firmware_version: { type: 'string', example: '1.0.0' },
            },
          }),
        },
        responses: {
          201: {
            description: 'Cihaz eklendi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  device: { $ref: '#/components/schemas/Device' },
                  device_key: { type: 'string', example: 'ONE_TIME_DEVICE_SECRET' },
                },
              })
            ),
          },
          409: errorResponseRef,
          422: errorResponseRef,
        },
      },
    },
    '/api/v1/users/me/devices': {
      get: {
        tags: ['Devices'],
        summary: 'Kullanıcının cihazlarını listeleme',
        security: bearerSecurity,
        responses: {
          200: {
            description: 'Cihaz listesi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  devices: { type: 'array', items: { $ref: '#/components/schemas/Device' } },
                },
              })
            ),
          },
          401: errorResponseRef,
        },
      },
    },
    '/api/v1/device/heartbeat': {
      post: {
        tags: ['Devices'],
        summary: 'Cihaz durumunu güncelleme (ESP32 / Cihaz kimlik doğrulamalı)',
        security: deviceSecurity,
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            properties: {
              battery_level: { type: 'integer', minimum: 0, maximum: 100, example: 85 },
              firmware_version: { type: 'string', example: '1.0.0' },
            },
          }),
        },
        responses: {
          200: {
            description: 'Cihaz durumu güncellendi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  device_id: { type: 'string', example: '1' },
                  battery_level: { type: 'integer', nullable: true, example: 85 },
                  firmware_version: { type: 'string', nullable: true, example: '1.0.0' },
                  is_active: { type: 'boolean', example: true },
                  last_seen_at: { type: 'string', format: 'date-time' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              })
            ),
          },
          401: errorResponseRef,
          422: errorResponseRef,
        },
      },
    },
    '/api/v1/device/measurements': {
      post: {
        tags: ['Measurements'],
        summary: 'Sensör verisi gönderme (idempotent sample_id destekli)',
        security: deviceSecurity,
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['sample_id', 'measured_at'],
            properties: {
              sample_id: { type: 'string', example: 'SAMPLE-000001' },
              measured_at: { type: 'string', format: 'date-time', example: '2026-11-08T12:30:15.250Z' },
              heart_rate_bpm: { type: 'number', nullable: true, example: 78.5 },
              spo2_percent: { type: 'number', nullable: true, example: 98.0 },
              gsr_raw: { type: 'integer', nullable: true, example: 1250 },
              stress_index: { type: 'number', nullable: true, example: 32.5 },
              movement: { type: 'string', example: 'walking' },
              wear_detected: { type: 'boolean', nullable: true, example: true },
              heart_rate_valid: { type: 'boolean', example: true },
              spo2_valid: { type: 'boolean', example: true },
              gsr_valid: { type: 'boolean', example: true },
              stress_valid: { type: 'boolean', example: true },
              fall_detected: { type: 'boolean', example: false },
              impact_g: { type: 'number', nullable: true, example: 1.1 },
            },
          }),
        },
        responses: {
          201: {
            description: 'Sensör verisi kaydedildi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  measurement_id: { type: 'string', example: '501' },
                  device_id: { type: 'string', example: '1' },
                  sample_id: { type: 'string', example: 'SAMPLE-000001' },
                  measured_at: { type: 'string', format: 'date-time' },
                  received_at: { type: 'string', format: 'date-time' },
                },
              })
            ),
          },
          200: { description: 'Aynı sample_id ve aynı veri (idempotent tekrar)' },
          409: errorResponseRef,
          422: errorResponseRef,
        },
      },
    },
    '/api/v1/users/{id}/measurements/latest': {
      get: {
        tags: ['Measurements'],
        summary: 'Son sensör paketini ve son geçerli değerleri getirme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Kullanıcı ID')],
        responses: {
          200: {
            description: 'Son ölçüm ve sensör bazlı son geçerli değerler',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  measurement: { allOf: [{ $ref: '#/components/schemas/Measurement' }], nullable: true },
                  last_valid: { $ref: '#/components/schemas/LastValidMeasurement' },
                },
              })
            ),
          },
          403: errorResponseRef,
        },
      },
    },
    '/api/v1/users/{id}/measurements': {
      get: {
        tags: ['Measurements'],
        summary: 'Sensör ölçüm geçmişini sayfalı getirme',
        security: bearerSecurity,
        parameters: [
          idParam('id', 'Kullanıcı ID'),
          { name: 'start_date', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
          { name: 'end_date', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
          ...paginationParams,
        ],
        responses: {
          200: {
            description: 'Ölçüm geçmişi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  measurements: { type: 'array', items: { $ref: '#/components/schemas/Measurement' } },
                  pagination: { $ref: '#/components/schemas/Pagination' },
                },
              })
            ),
          },
          403: errorResponseRef,
        },
      },
    },
    '/api/v1/users/{id}/summary': {
      get: {
        tags: ['Measurements'],
        summary: 'Kullanıcı sağlık özetini getirme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Kullanıcı ID')],
        responses: {
          200: {
            description: 'Sağlık özeti',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  user_id: { type: 'string', example: '1' },
                  latest_measurement: { type: 'object', nullable: true },
                  last_valid_measurement: { $ref: '#/components/schemas/LastValidMeasurement' },
                  device: { allOf: [{ $ref: '#/components/schemas/Device' }], nullable: true },
                  active_event_count: { type: 'integer', example: 0 },
                },
              })
            ),
          },
          403: errorResponseRef,
        },
      },
    },
    '/api/v1/users/{id}/thresholds': {
      get: {
        tags: ['Thresholds'],
        summary: 'Kullanıcı sağlık eşik değerlerini getirme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Kullanıcı ID')],
        responses: {
          200: {
            description: 'Eşik değerleri',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/Threshold' })),
          },
          404: errorResponseRef,
        },
      },
      put: {
        tags: ['Thresholds'],
        summary: 'Kullanıcı sağlık eşik değerlerini oluşturma / güncelleme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Kullanıcı ID')],
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            properties: {
              min_heart_rate_bpm: { type: 'number', nullable: true, example: 50 },
              max_heart_rate_bpm: { type: 'number', nullable: true, example: 120 },
              min_spo2_percent: { type: 'number', nullable: true, example: 90 },
              fall_impact_threshold_g: { type: 'number', nullable: true, example: 2.5 },
              stress_threshold: { type: 'number', nullable: true, example: 70 },
              is_enabled: { type: 'boolean', example: true },
            },
          }),
        },
        responses: {
          200: {
            description: 'Eşik değerleri güncellendi',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/Threshold' })),
          },
          422: errorResponseRef,
        },
      },
    },
    '/api/v1/users/{id}/events': {
      get: {
        tags: ['Events'],
        summary: 'Acil durum olaylarını listeleme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Kullanıcı ID'), ...paginationParams],
        responses: {
          200: {
            description: 'Acil durum listesi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  events: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
                  pagination: { $ref: '#/components/schemas/Pagination' },
                },
              })
            ),
          },
          403: errorResponseRef,
        },
      },
    },
    '/api/v1/events/{id}': {
      put: {
        tags: ['Events'],
        summary: 'Acil durum geri sayımını iptal etme veya olayı çözme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Olay ID')],
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['action'],
            properties: {
              action: { type: 'string', enum: ['cancel', 'resolve'], example: 'cancel' },
              resolution_reason: {
                type: 'string',
                nullable: true,
                example: 'Kullanıcı güvende olduğunu onayladı.',
              },
            },
          }),
        },
        responses: {
          200: {
            description: 'Olay durumu güncellendi',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/Event' })),
          },
          403: errorResponseRef,
          404: errorResponseRef,
          409: errorResponseRef,
        },
      },
    },
    '/api/v1/users/{id}/contacts': {
      get: {
        tags: ['Contacts'],
        summary: 'Acil durum kişilerini listeleme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Kullanıcı ID')],
        responses: {
          200: {
            description: 'Acil durum kişileri',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  contacts: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                },
              })
            ),
          },
        },
      },
      post: {
        tags: ['Contacts'],
        summary: 'Acil durum kişisi ekleme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Kullanıcı ID')],
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['full_name'],
            properties: {
              linked_user_id: { type: 'string', nullable: true, example: null },
              full_name: { type: 'string', example: 'Ahmet Yılmaz' },
              phone_number: { type: 'string', nullable: true, example: '+905551112233' },
              priority: { type: 'integer', minimum: 1, default: 1, example: 1 },
            },
          }),
        },
        responses: {
          201: {
            description: 'Acil durum kişisi eklendi',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/Contact' })),
          },
          409: errorResponseRef,
          422: errorResponseRef,
        },
      },
    },
    '/api/v1/users/{id}/contacts/{contactId}': {
      delete: {
        tags: ['Contacts'],
        summary: 'Acil durum kişisini pasifleştirme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Kullanıcı ID'), idParam('contactId', 'Kişi ID')],
        responses: {
          200: {
            description: 'Kişi pasifleştirildi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  id: { type: 'string', example: '10' },
                  is_active: { type: 'boolean', example: false },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              })
            ),
          },
          404: errorResponseRef,
        },
      },
    },
    '/api/v1/users/{id}/access': {
      post: {
        tags: ['Access'],
        summary: 'Yakın kullanıcıya veri görüntüleme izni isteği gönderme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Veri sahibi kullanıcı ID')],
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['viewer_id'],
            properties: {
              viewer_id: { type: 'string', example: '2' },
            },
          }),
        },
        responses: {
          201: {
            description: 'Erişim isteği oluşturuldu',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/AccessPermission' })),
          },
          409: errorResponseRef,
          422: errorResponseRef,
        },
      },
    },
    '/api/v1/me/access': {
      get: {
        tags: ['Access'],
        summary: 'Gelen ve giden erişim izinlerini listeleme',
        security: bearerSecurity,
        responses: {
          200: {
            description: 'Erişim izinleri',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  incoming: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/AccessPermission' },
                  },
                  outgoing: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/AccessPermission' },
                  },
                },
              })
            ),
          },
        },
      },
    },
    '/api/v1/access/{id}': {
      put: {
        tags: ['Access'],
        summary: 'Erişim isteğini kabul etme veya reddetme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Erişim izni ID')],
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['action'],
            properties: {
              action: { type: 'string', enum: ['accept', 'reject'], example: 'accept' },
            },
          }),
        },
        responses: {
          200: {
            description: 'Erişim isteği güncellendi',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/AccessPermission' })),
          },
          403: errorResponseRef,
          409: errorResponseRef,
        },
      },
      delete: {
        tags: ['Access'],
        summary: 'Erişim iznini iptal etme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Erişim izni ID')],
        responses: {
          200: {
            description: 'Erişim izni iptal edildi',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/AccessPermission' })),
          },
          403: errorResponseRef,
          404: errorResponseRef,
        },
      },
    },
    '/api/v1/me/push-tokens': {
      post: {
        tags: ['PushTokens'],
        summary: 'Push bildirim tokenı kaydetme',
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['provider', 'platform', 'installation_id', 'token'],
            properties: {
              provider: { type: 'string', example: 'fcm' },
              platform: { type: 'string', enum: ['android', 'ios'], example: 'android' },
              installation_id: { type: 'string', example: 'APP-INSTALLATION-001' },
              token: { type: 'string', example: 'FCM_DEVICE_TOKEN' },
            },
          }),
        },
        responses: {
          201: {
            description: 'Token kaydedildi',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/PushToken' })),
          },
          422: errorResponseRef,
        },
      },
    },
    '/api/v1/me/push-tokens/{id}': {
      delete: {
        tags: ['PushTokens'],
        summary: 'Push bildirim tokenını pasifleştirme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Push Token ID')],
        responses: {
          200: {
            description: 'Token pasifleştirildi',
            content: jsonContent(successSchema({ $ref: '#/components/schemas/PushToken' })),
          },
          404: errorResponseRef,
        },
      },
    },
    '/api/v1/users/me/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Kullanıcının bildirimlerini listeleme',
        security: bearerSecurity,
        parameters: [...paginationParams],
        responses: {
          200: {
            description: 'Bildirim listesi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  notifications: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Notification' },
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' },
                },
              })
            ),
          },
        },
      },
    },
    '/api/v1/notifications/{id}/read': {
      put: {
        tags: ['Notifications'],
        summary: 'Bildirimi okundu olarak işaretleme',
        security: bearerSecurity,
        parameters: [idParam('id', 'Bildirim ID')],
        requestBody: {
          required: false,
          content: jsonContent({ type: 'object', example: {} }),
        },
        responses: {
          200: {
            description: 'Bildirim okundu olarak işaretlendi',
            content: jsonContent(
              successSchema({
                type: 'object',
                properties: {
                  id: { type: 'string', example: '100' },
                  read_at: { type: 'string', format: 'date-time' },
                },
              })
            ),
          },
          404: errorResponseRef,
        },
      },
    },
  },
};
