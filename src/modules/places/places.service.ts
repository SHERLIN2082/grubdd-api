import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
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
    const url = `${this.baseUrl}/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${this.apiKey}`;
    const data = await this.callGoogleApi(url);
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

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`;
    const data = await this.callGoogleApi(url);
    return { address: data.results[0]?.formatted_address ?? '', latitude, longitude };
  }

  async nearby(
    latitude: string,
    longitude: string,
    radiusKm: string,
    priceFilter: string | null,
  ): Promise<GooglePlace[]> {
    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      radius: String(Number(radiusKm) * 1000),
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
    return data.results;
  }
}
