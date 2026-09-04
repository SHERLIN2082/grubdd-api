import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  price_level?: number;
  geometry?: { location: { lat: number; lng: number } };
  photos?: Array<{ photo_reference: string }>;
}

interface GooglePrediction {
  place_id: string;
  description: string;
}

@Injectable()
export class PlacesService {
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private readonly logger = new Logger(PlacesService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey() {
    const key = this.configService.get<string>('GOOGLE_PLACES_API_KEY');

    if (!key) {
      throw new ServiceUnavailableException(
        'Google Places API key is not configured',
      );
    }

    return key;
  }

  private async callGoogleApi(url: string): Promise<any> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadGatewayException('Google Places request failed');
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      const message = data.error_message ?? `Google Places error: ${data.status}`;
      throw new BadGatewayException(message);
    }

    return data;
  }

  private distanceKm(
    firstLatitude: number,
    firstLongitude: number,
    secondLatitude: number,
    secondLongitude: number,
  ): number {
    const toRadians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDelta = toRadians(secondLatitude - firstLatitude);
    const longitudeDelta = toRadians(secondLongitude - firstLongitude);
    const startLatitude = toRadians(firstLatitude);
    const endLatitude = toRadians(secondLatitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(startLatitude) * Math.cos(endLatitude)
      * Math.sin(longitudeDelta / 2) ** 2;

    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  private getPlaceDistance(
    place: GooglePlace,
    centerLatitude: number,
    centerLongitude: number,
  ): number | null {
    const location = place.geometry?.location;

    if (!location) {
      return null;
    }

    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      return null;
    }

    return this.distanceKm(
      centerLatitude,
      centerLongitude,
      location.lat,
      location.lng,
    );
  }

  async autocomplete(query: string) {
    if (!query || typeof query !== 'string') {
      throw new BadRequestException('query is required');
    }

    if (query.length < 2 || query.length > 100) {
      throw new BadRequestException('query must be between 2 and 100 characters');
    }

    const url = `${this.baseUrl}/autocomplete/json?input=${encodeURIComponent(query)}&key=${this.apiKey}`;
    const data = await this.callGoogleApi(url);

    return data.predictions.map((place: GooglePrediction) => ({
      placeId: place.place_id,
      description: place.description,
    }));
  }

  async details(placeId: string) {
    if (!placeId) {
      throw new BadRequestException('placeId is required');
    }

    const fields = 'place_id,formatted_address,geometry';
    const params = new URLSearchParams({
      place_id: placeId,
      fields,
      key: this.apiKey,
    });
    const url = `${this.baseUrl}/details/json?${params}`;
    const data = await this.callGoogleApi(url);

    this.logger.log(
      `[LOCATION 2] Selected place: ${data.result.formatted_address} ` +
      `(${data.result.geometry.location.lat}, ${data.result.geometry.location.lng})`,
    );

    return {
      placeId: data.result.place_id,
      address: data.result.formatted_address,
      latitude: data.result.geometry.location.lat,
      longitude: data.result.geometry.location.lng,
    };
  }

  async reverseGeocode(latitude: number, longitude: number) {
    latitude = Number(latitude);
    longitude = Number(longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('latitude must be between -90 and 90');
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('longitude must be between -180 and 180');
    }

    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      key: this.apiKey,
    });
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    const data = await this.callGoogleApi(url);
    const address = data.results[0]?.formatted_address ?? '';

    this.logger.log(
      `[LOCATION 2] Reverse geocode: ${address} (${latitude}, ${longitude})`,
    );

    return { address, latitude, longitude };
  }

  async photo(reference: string) {
    if (!reference) {
      throw new BadRequestException('photo reference is required');
    }
    const params = new URLSearchParams({
      maxwidth: '900',
      photo_reference: reference,
      key: this.apiKey,
    });
    const url = `${this.baseUrl}/photo?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadGatewayException('Google Places photo request failed');
    }
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'image/jpeg',
    };
  }

  async nearby(
    latitude: string,
    longitude: string,
    radiusKm: string,
    priceFilter: string | null,
  ): Promise<GooglePlace[]> {
    const centerLatitude = Number(latitude);
    const centerLongitude = Number(longitude);
    const searchRadiusKm = Number(radiusKm);

    this.logger.log(
      `[LOCATION 4] Searching from (${centerLatitude}, ${centerLongitude}), ` +
      `radius: ${searchRadiusKm} km, prices: ${priceFilter ?? 'all'}`,
    );

    if (!Number.isFinite(centerLatitude) || !Number.isFinite(centerLongitude)) {
      throw new BadRequestException('A valid search location is required');
    }
    if (!Number.isFinite(searchRadiusKm) || searchRadiusKm <= 0) {
      throw new BadRequestException('A valid search radius is required');
    }

    const params = new URLSearchParams({
      location: `${centerLatitude},${centerLongitude}`,
      radius: String(searchRadiusKm * 1000),
      type: 'restaurant',
      key: this.apiKey,
    });
    if (priceFilter) {
      const prices = priceFilter.split(',').map(Number);
      params.set('minprice', String(Math.min(...prices)));
      params.set('maxprice', String(Math.max(...prices)));
    }

    const url = `${this.baseUrl}/nearbysearch/json?${params}`;
    const data = await this.callGoogleApi(url);
    const googleResults = data.results as GooglePlace[];

    this.logger.log(
      `[LOCATION 5] Google returned ${googleResults.length} restaurants`,
    );

    const nearbyRestaurants: GooglePlace[] = [];

    // Check every Google result one at a time.
    for (const place of googleResults) {
      const distance = this.getPlaceDistance(
        place,
        centerLatitude,
        centerLongitude,
      );

      if (distance === null) {
        this.logger.log(`[LOCATION 6] Removed ${place.name}: missing coordinates`);
        continue;
      }

      const isInsideRadius = distance <= searchRadiusKm;
      this.logger.log(
        `[LOCATION 6] ${place.name}: ${distance.toFixed(2)} km - ` +
        `${isInsideRadius ? 'included' : 'removed'}`,
      );

      if (isInsideRadius) {
        nearbyRestaurants.push(place);
      }
    }

    // Higher-rated restaurants appear first.
    nearbyRestaurants.sort((first, second) => {
      const firstRating = first.rating ?? 0;
      const secondRating = second.rating ?? 0;

      if (firstRating !== secondRating) {
        return secondRating - firstRating;
      }

      const firstDistance = this.getPlaceDistance(
        first,
        centerLatitude,
        centerLongitude,
      ) ?? 0;
      const secondDistance = this.getPlaceDistance(
        second,
        centerLatitude,
        centerLongitude,
      ) ?? 0;

      return firstDistance - secondDistance;
    });

    this.logger.log(
      `[LOCATION 7] ${nearbyRestaurants.length} restaurant cards kept`,
    );

    return nearbyRestaurants;
  }
}
