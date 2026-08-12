import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GuestLoginDto } from './dto/guest-login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('guest')
  @ApiOperation({ summary: 'Create or sign in a guest user' })
  @ApiBody({ type: GuestLoginDto })
  guest(@Body() dto: GuestLoginDto) {
    return this.authService.loginAsGuest(dto.deviceId);
  }
}
