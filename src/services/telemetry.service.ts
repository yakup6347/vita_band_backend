import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HEALTH_THRESHOLDS, HTTP_STATUS } from '../constants';
import { AlertService } from './alert.service';

export class TelemetryService {
  // Tekil telemetri ölçümünü kaydetme
  static async recordTelemetry(userId: number, data: {
    macAddress: string;
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    stepCount?: number;
    calories?: number;
    fallDetected?: boolean;
    accelX?: number;
    accelY?: number;
    accelZ?: number;
    batteryLevel?: number;
    recordedAt?: string;
  }) {
    const device = await prisma.device.findUnique({
      where: { macAddress: data.macAddress },
    });

    if (!device) {
      throw new AppError('Kayıtlı olmayan cihaz MAC adresi', HTTP_STATUS.NOT_FOUND);
    }

    const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();

    // Telemetri kaydı
    const telemetry = await prisma.telemetry.create({
      data: {
        deviceId: device.id,
        heartRate: data.heartRate,
        spo2: data.spo2,
        temperature: data.temperature,
        stepCount: data.stepCount,
        calories: data.calories,
        fallDetected: data.fallDetected ?? false,
        accelX: data.accelX,
        accelY: data.accelY,
        accelZ: data.accelZ,
        batteryLevel: data.batteryLevel,
        recordedAt,
      },
    });

    // Cihazın pil ve son senkronizasyon bilgisini güncelle
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lastSyncAt: recordedAt,
        isOnline: true,
        ...(data.batteryLevel !== undefined ? { batteryLevel: data.batteryLevel } : {}),
      },
    });

    // Otomatik Eşik Kontrolleri (Sağlık uyarıları üretimi)
    await this.checkThresholdsAndTriggerAlerts(device.id, device.userId || userId, data);

    return {
      ...telemetry,
      id: Number(telemetry.id),
    };
  }

  // Toplu ölçüm verisi kaydetme (Senkronizasyon sonrası)
  static async recordBatchTelemetry(userId: number, macAddress: string, readings: any[]) {
    const device = await prisma.device.findUnique({
      where: { macAddress },
    });

    if (!device) {
      throw new AppError('Cihaz bulunamadı', HTTP_STATUS.NOT_FOUND);
    }

    const records = readings.map((r) => ({
      deviceId: device.id,
      heartRate: r.heartRate,
      spo2: r.spo2,
      temperature: r.temperature,
      stepCount: r.stepCount,
      calories: r.calories,
      fallDetected: r.fallDetected ?? false,
      accelX: r.accelX,
      accelY: r.accelY,
      accelZ: r.accelZ,
      batteryLevel: r.batteryLevel,
      recordedAt: r.recordedAt ? new Date(r.recordedAt) : new Date(),
    }));

    await prisma.telemetry.createMany({
      data: records,
    });

    // Son kayıttan pil ve zaman güncelle
    const lastReading = readings[readings.length - 1];
    if (lastReading) {
      await prisma.device.update({
        where: { id: device.id },
        data: {
          lastSyncAt: lastReading.recordedAt ? new Date(lastReading.recordedAt) : new Date(),
          isOnline: true,
          ...(lastReading.batteryLevel !== undefined ? { batteryLevel: lastReading.batteryLevel } : {}),
        },
      });
    }

    return { savedCount: records.length };
  }

  // Cihazın geçmiş telemetri verilerini sorgulama
  static async getDeviceTelemetryHistory(
    userId: number,
    deviceId: number,
    options: { limit?: number; startDate?: string; endDate?: string }
  ) {
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new AppError('Cihaz bulunamadı veya size ait değil', HTTP_STATUS.NOT_FOUND);
    }

    const whereClause: any = { deviceId };
    if (options.startDate || options.endDate) {
      whereClause.recordedAt = {};
      if (options.startDate) whereClause.recordedAt.gte = new Date(options.startDate);
      if (options.endDate) whereClause.recordedAt.lte = new Date(options.endDate);
    }

    const data = await prisma.telemetry.findMany({
      where: whereClause,
      orderBy: { recordedAt: 'desc' },
      take: options.limit ? Math.min(options.limit, 1000) : 100,
    });

    return data.map((item) => ({
      ...item,
      id: Number(item.id),
    }));
  }

  // Eşik değer analizi ve otomatik alarm tetikleme
  private static async checkThresholdsAndTriggerAlerts(
    deviceId: number,
    userId: number,
    data: any
  ) {
    const { HEART_RATE, SPO2, TEMPERATURE, BATTERY } = HEALTH_THRESHOLDS;

    // Düşme Algılandı
    if (data.fallDetected) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'FALL_DETECTED',
        severity: 'CRITICAL',
        message: 'Düşme algılandı! Kullanıcının durumu kontrol edilmelidir.',
      });
    }

    // Kritik Yüksek Nabız
    if (data.heartRate && data.heartRate >= HEART_RATE.CRITICAL_HIGH) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'HIGH_HEART_RATE',
        severity: 'HIGH',
        message: `Kritik yüksek nabız algılandı: ${data.heartRate} BPM`,
      });
    }

    // Kritik Düşük Nabız
    if (data.heartRate && data.heartRate <= HEART_RATE.CRITICAL_LOW) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'LOW_HEART_RATE',
        severity: 'HIGH',
        message: `Kritik düşük nabız algılandı: ${data.heartRate} BPM`,
      });
    }

    // Düşük Kandaki Oksijen (SpO2)
    if (data.spo2 && data.spo2 <= SPO2.CRITICAL_LOW) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'LOW_SPO2',
        severity: 'CRITICAL',
        message: `Kritik seviyede düşük oksijen doygunluğu: %${data.spo2}`,
      });
    }

    // Yüksek Ateş
    if (data.temperature && data.temperature >= TEMPERATURE.HIGH_FEVER) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'HIGH_TEMPERATURE',
        severity: 'HIGH',
        message: `Yüksek vücut sıcaklığı (Ateş): ${data.temperature}°C`,
      });
    }

    // Düşük Pil Uyarısı
    if (data.batteryLevel !== undefined && data.batteryLevel <= BATTERY.CRITICAL_LOW) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'LOW_BATTERY',
        severity: 'LOW',
        message: `Bileklik pili kritik seviyede: %${data.batteryLevel}`,
      });
    }
  }
}
