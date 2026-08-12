import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './auth-user.interface';

export interface AuthRequest {
  headers: {
    authorization?: string;
  };
  user: AuthUser;
}

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async use(request: AuthRequest, _response: unknown, next: () => void) {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const token = authorization.substring(7);

    try {
      request.user = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'dev-secret'),
      });
      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
