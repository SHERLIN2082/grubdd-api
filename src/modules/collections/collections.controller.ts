import { Body, Controller, Delete, Get, Param, Patch, Post as HttpPost, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../../common/interfaces/auth-request.interface';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CollectionsService } from './collections.service';

@Controller('collections')
@ApiTags('Collections')
@ApiBearerAuth()
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  list(@Req() request: AuthRequest) { return this.collections.list(request.user.id); }

  @HttpPost()
  create(@Req() request: AuthRequest, @Body() dto: CreateCollectionDto) {
    return this.collections.create(request.user.id, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.collections.getOne(id, request.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() request: AuthRequest, @Body() dto: UpdateCollectionDto) {
    return this.collections.update(id, request.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.collections.remove(id, request.user.id);
  }
}
