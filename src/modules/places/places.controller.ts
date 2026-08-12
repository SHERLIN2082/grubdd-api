import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';
import { ReverseGeocodeQueryDto } from './dto/reverse-geocode-query.dto';
import { PlacesService } from './places.service';

@Controller('places')
@UseGuards(JwtAuthGuard)
@ApiTags('Places')
@ApiBearerAuth()
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get('autocomplete')
  @ApiOperation({ summary: 'Search locations by text' })
  autocomplete(@Query() query: AutocompleteQueryDto) {
    return this.places.autocomplete(query.query);
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Convert coordinates into an address' })
  reverse(@Query() query: ReverseGeocodeQueryDto) {
    return this.places.reverseGeocode(query.lat, query.lng);
  }

  @Get(':placeId')
  @ApiOperation({ summary: 'Get details for a Google place ID' })
  details(@Param('placeId') placeId: string) {
    return this.places.details(placeId);
  }
}
