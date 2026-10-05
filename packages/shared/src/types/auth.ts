import { z } from 'zod';
import {
  userRoleSchema,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../schemas/auth';

export type UserRole = z.infer<typeof userRoleSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
  };
  accessToken: string;
}