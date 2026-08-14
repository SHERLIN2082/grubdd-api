import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthRequest } from '../interfaces/auth-request.interface';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async use(
    request: AuthRequest,
    _response: unknown,
    next: () => void,
  ): Promise<void> {
    const token = this.getBearerToken(request.headers.authorization);

    try {
      // Verify the token, then make its user information available to controllers.
      request.user = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'dev-secret'),
      });

      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getBearerToken(authorization?: string): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    return authorization.substring(7);
  }
}
