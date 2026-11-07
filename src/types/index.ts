import { Request } from 'express';

// JWT payload formatı
export interface JwtPayload {
  userId: number;
  email: string;
}

// Kimliği doğrulanmış kullanıcı isteği (AuthMiddleware sonrası)
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Standart API yanıt yapısı
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string | any;
  timestamp: string;
}

// Sensör Telemetri Verisi (Mobil uygulamadan POST edilecek payload)
export interface TelemetryPayload {
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
  recordedAt?: string; // ISO 8601 string
}
