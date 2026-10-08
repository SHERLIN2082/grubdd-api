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

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby restaurants' })
  nearby(
    @Query('lat') latitude: string,
    @Query('lng') longitude: string,
    @Query('radiusKm') radiusKm = '5',
    @Query('price') price: string | null,
    @Query('foodPreference') foodPreference: string | null,
    @Query('category') category: string | null,
  ) {
    return this.places.nearby(latitude, longitude, radiusKm, price, foodPreference, category);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search restaurants by text' })
  search(@Query('query') query: string) {
    return this.places.searchRestaurants(query);
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
