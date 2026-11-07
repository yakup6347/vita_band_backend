import { z } from 'zod';

export const createAlertSchema = z.object({
  body: z.object({
    deviceId: z.number().int().positive(),
    type: z.enum([
      'FALL_DETECTED',
      'HIGH_HEART_RATE',
      'LOW_HEART_RATE',
      'LOW_SPO2',
      'HIGH_TEMPERATURE',
      'PANIC_BUTTON',
      'LOW_BATTERY',
    ]),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    message: z.string().min(1, 'Uyarı mesajı gereklidir'),
  }),
});
