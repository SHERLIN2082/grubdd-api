import { Body, Controller, Get, Post as HttpPost, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../../common/interfaces/auth-request.interface';
import { CreateVisitDto } from './dto/create-visit.dto';
import { FoodTrailService } from './food-trail.service';

@Controller('food-trail')
@ApiTags('Food Trail')
@ApiBearerAuth()
export class FoodTrailController {
  constructor(private readonly trail: FoodTrailService) {}
  @Get() list(@Req() request: AuthRequest) { return this.trail.list(request.user.id); }
  @HttpPost() create(@Req() request: AuthRequest, @Body() dto: CreateVisitDto) { return this.trail.create(request.user.id, dto); }
}
