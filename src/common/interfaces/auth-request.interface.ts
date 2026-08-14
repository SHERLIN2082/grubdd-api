import { AuthUser } from './auth-user.interface';

/** Express request after JwtAuthMiddleware has authenticated the user. */
export interface AuthRequest {
  headers: {
    authorization?: string;
  };
  user: AuthUser;
}
