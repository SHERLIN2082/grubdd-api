import { Body, Controller, Get, Post as HttpPost, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../../common/interfaces/auth-request.interface';
import { SavePlaceDto } from './dto/save-place.dto';
import { SavedPlacesService } from './saved-places.service';

@Controller('saved-places')
@ApiTags('Saved Places')
@ApiBearerAuth()
export class SavedPlacesController {
  constructor(private readonly savedPlaces: SavedPlacesService) {}
  @Get() list(@Req() request: AuthRequest) { return this.savedPlaces.list(request.user.id); }
  @HttpPost('toggle') toggle(@Req() request: AuthRequest, @Body() dto: SavePlaceDto) { return this.savedPlaces.toggle(request.user.id, dto); }
}
