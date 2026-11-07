import { z } from 'zod';

export const registerDeviceSchema = z.object({
  body: z.object({
    macAddress: z.string().min(12, 'Geçerli bir BLE MAC adresi giriniz (örn: AA:BB:CC:DD:EE:FF)'),
    deviceName: z.string().min(1, 'Cihaz adı boş bırakılamaz'),
    serialNumber: z.string().optional(),
    firmwareVer: z.string().optional(),
  }),
});

export const updateDeviceSchema = z.object({
  body: z.object({
    deviceName: z.string().optional(),
    batteryLevel: z.number().min(0).max(100).optional(),
    isOnline: z.boolean().optional(),
  }),
});
