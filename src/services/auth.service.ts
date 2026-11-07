import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    emergencyContact?: string;
    bloodType?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError('Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var', HTTP_STATUS.CONFLICT);
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emergencyContact: true,
        bloodType: true,
        createdAt: true,
      },
    });

    const token = generateToken({ userId: user.id, email: user.email });

    return { user, token };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('E-posta veya şifre hatalı', HTTP_STATUS.UNAUTHORIZED);
    }

    const isValid = await comparePassword(data.password, user.password);
    if (!isValid) {
      throw new AppError('E-posta veya şifre hatalı', HTTP_STATUS.UNAUTHORIZED);
    }

    const token = generateToken({ userId: user.id, email: user.email });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
}
