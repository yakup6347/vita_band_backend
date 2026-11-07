import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

export class DeviceService {
  // Kullanıcının kendi bilekliğini eşleştirmesi veya yeni cihaz kaydı
  static async registerOrPairDevice(userId: number, data: {
    macAddress: string;
    deviceName: string;
    serialNumber?: string;
    firmwareVer?: string;
  }) {
    const existing = await prisma.device.findUnique({
      where: { macAddress: data.macAddress },
    });

    if (existing) {
      // Eğer cihaz zaten varsa kullanıcıya bağla ve güncelle
      return await prisma.device.update({
        where: { id: existing.id },
        data: {
          userId,
          deviceName: data.deviceName || existing.deviceName,
          serialNumber: data.serialNumber || existing.serialNumber,
          firmwareVer: data.firmwareVer || existing.firmwareVer,
          isOnline: true,
          lastSyncAt: new Date(),
        },
      });
    }

    return await prisma.device.create({
      data: {
        userId,
        macAddress: data.macAddress,
        deviceName: data.deviceName,
        serialNumber: data.serialNumber,
        firmwareVer: data.firmwareVer,
        isOnline: true,
        lastSyncAt: new Date(),
      },
    });
  }

  // Kullanıcının eşleştiği cihazları listeleme
  static async getUserDevices(userId: number) {
    return await prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { alerts: true, telemetry: true },
        },
      },
    });
  }

  // Cihaz durumu ve son ölçüm özetini alma
  static async getDeviceDetails(userId: number, deviceId: number) {
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId },
      include: {
        telemetry: {
          take: 1,
          orderBy: { recordedAt: 'desc' },
        },
        alerts: {
          where: { isResolved: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!device) {
      throw new AppError('Cihaz bulunamadı veya size ait değil', HTTP_STATUS.NOT_FOUND);
    }

    return device;
  }

  // Cihaz bilgilerini güncelleme
  static async updateDevice(userId: number, deviceId: number, data: {
    deviceName?: string;
    batteryLevel?: number;
    isOnline?: boolean;
  }) {
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new AppError('Cihaz bulunamadı veya size ait değil', HTTP_STATUS.NOT_FOUND);
    }

    return await prisma.device.update({
      where: { id: deviceId },
      data: {
        ...data,
        lastSyncAt: new Date(),
      },
    });
  }
}
