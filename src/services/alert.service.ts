import prisma from '../config/database';
import { AlertType, Severity } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

export class AlertService {
  // Yeni bir uyarı/alarm oluşturma (Sensör eşiği aşıldığında veya manuel acil durum butonunda)
  static async createAlert(data: {
    deviceId: number;
    userId: number;
    type: AlertType;
    severity?: Severity;
    message: string;
  }) {
    return await prisma.alert.create({
      data: {
        deviceId: data.deviceId,
        userId: data.userId,
        type: data.type,
        severity: data.severity || 'MEDIUM',
        message: data.message,
      },
    });
  }

  // Kullanıcının veya cihazın uyarılarını listeleme
  static async getUserAlerts(userId: number, resolved?: boolean) {
    const where: any = { userId };
    if (resolved !== undefined) {
      where.isResolved = resolved;
    }

    return await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        device: {
          select: { id: true, deviceName: true, macAddress: true },
        },
      },
    });
  }

  // Uyarıyı çözüldü olarak işaretleme
  static async resolveAlert(userId: number, alertId: number) {
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, userId },
    });

    if (!alert) {
      throw new AppError('Uyarı bulunamadı veya yetkiniz yok', HTTP_STATUS.NOT_FOUND);
    }

    return await prisma.alert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });
  }
}
