import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';
import { ReverseGeocodeQueryDto } from './dto/reverse-geocode-query.dto';
import { PlacesService } from './places.service';

interface PhotoResponse {
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

@Controller('places')
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

  @Get('photo')
  @ApiOperation({
    summary: 'Load a Google Places photo without exposing the API key',
  })
  async photo(
    @Query('reference') reference: string,
    @Res() response: PhotoResponse,
  ) {
    const photo = await this.places.photo(reference);
    response.setHeader('Content-Type', photo.contentType);
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.send(photo.bytes);
  }

  @Get(':placeId')
  @ApiOperation({ summary: 'Get details for a Google place ID' })
  details(@Param('placeId') placeId: string) {
    return this.places.details(placeId);
  }
}
