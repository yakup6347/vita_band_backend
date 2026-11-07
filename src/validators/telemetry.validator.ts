import { z } from 'zod';

export const createTelemetrySchema = z.object({
  body: z.object({
    macAddress: z.string().min(12, 'Geçerli bir MAC adresi belirtilmelidir'),
    heartRate: z.number().min(20).max(250).optional(),
    spo2: z.number().min(50).max(100).optional(),
    temperature: z.number().min(25).max(45).optional(),
    stepCount: z.number().nonnegative().optional(),
    calories: z.number().nonnegative().optional(),
    fallDetected: z.boolean().optional(),
    accelX: z.number().optional(),
    accelY: z.number().optional(),
    accelZ: z.number().optional(),
    batteryLevel: z.number().min(0).max(100).optional(),
    recordedAt: z.string().datetime().optional(), // ISO 8601
  }),
});

// Toplu telemetri gönderimi (Örn: BLE bağlantısı koptuktan sonra mobilde biriken verilerin toplu aktarımı)
export const batchTelemetrySchema = z.object({
  body: z.object({
    macAddress: z.string().min(12, 'Geçerli bir MAC adresi belirtilmelidir'),
    readings: z.array(
      z.object({
        heartRate: z.number().optional(),
        spo2: z.number().optional(),
        temperature: z.number().optional(),
        stepCount: z.number().optional(),
        calories: z.number().optional(),
        fallDetected: z.boolean().optional(),
        accelX: z.number().optional(),
        accelY: z.number().optional(),
        accelZ: z.number().optional(),
        batteryLevel: z.number().optional(),
        recordedAt: z.string().datetime().optional(),
      })
    ).min(1, 'En az bir ölçüm verisi gönderilmelidir'),
  }),
});
