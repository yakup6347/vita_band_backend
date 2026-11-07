import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

export class UserService {
  static async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emergencyContact: true,
        birthDate: true,
        gender: true,
        bloodType: true,
        createdAt: true,
        devices: {
          select: {
            id: true,
            macAddress: true,
            deviceName: true,
            isOnline: true,
            batteryLevel: true,
            lastSyncAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', HTTP_STATUS.NOT_FOUND);
    }

    return user;
  }

  static async updateProfile(userId: number, data: {
    name?: string;
    phone?: string;
    emergencyContact?: string;
    birthDate?: Date;
    gender?: string;
    bloodType?: string;
  }) {
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emergencyContact: true,
        birthDate: true,
        gender: true,
        bloodType: true,
        updatedAt: true,
      },
    });
  }
}
