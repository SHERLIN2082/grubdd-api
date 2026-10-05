import { Body, Controller, Get, Param, Post as HttpPost, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../../common/interfaces/auth-request.interface';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
@ApiTags('Groups')
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}
  @Get() list(@Req() request: AuthRequest) { return this.groups.list(request.user.id); }
  @Get(':id') getOne(@Param('id') id: string, @Req() request: AuthRequest) { return this.groups.getOne(id, request.user.id); }
  @HttpPost() create(@Req() request: AuthRequest, @Body() dto: CreateGroupDto) {
    return this.groups.create(request.user.id, dto);
  }
  @HttpPost(':id/join') join(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.groups.join(request.user.id, id);
  }
}
