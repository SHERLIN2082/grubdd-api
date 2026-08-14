import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../../common/interfaces/auth-request.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  me(@Req() request: AuthRequest) {
    return this.usersService.findMe(request.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Create or update my profile' })
  @ApiBody({ type: UpdateProfileDto })
  update(@Req() request: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(request.user.id, dto);
  }
}
