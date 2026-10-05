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
  user_ratings_total?: number;
  types?: string[];
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

  private async callGoogleApi(url: string, allowPendingPage = false): Promise<any> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadGatewayException('Google Places request failed');
    }

    const data = await response.json();

    if (allowPendingPage && data.status === 'INVALID_REQUEST') return data;

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
      rankby: 'prominence',
      key: this.apiKey,
    });
    if (priceFilter) {
      const prices = priceFilter.split(',').map(Number);
      // An unrestricted budget should also include places without price data.
      if (![0, 1, 2, 3, 4].every((level) => prices.includes(level))) {
        params.set('minprice', String(Math.min(...prices)));
        params.set('maxprice', String(Math.max(...prices)));
      }
    }

    const cafeParams = new URLSearchParams(params);
    cafeParams.set('type', 'cafe');
    const [restaurants, cafes] = await Promise.all([
      this.nearbyPages(params),
      this.nearbyPages(cafeParams),
    ]);
    const googleResults: GooglePlace[] = [];
    const seenIds = new Set<string>();
    // Interleave the two prominence-ranked lists, keeping each branch once.
    for (let index = 0; index < Math.max(restaurants.length, cafes.length); index++) {
      for (const place of [restaurants[index], cafes[index]]) {
        if (place && !seenIds.has(place.place_id)) {
          seenIds.add(place.place_id);
          googleResults.push(place);
        }
      }
    }

    this.logger.log(
      `[LOCATION 5] Google returned ${googleResults.length} restaurants`,
    );

    const nearbyRestaurants: GooglePlace[] = [];

    // Check every Google result one at a time.
    for (const place of googleResults) {
      const rejection = this.diningRejection(place);
      if (rejection) {
        this.logger.log(`[DINING FILTER] Removed ${place.name}: ${rejection}`);
        continue;
      }
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

    // Only established, well-rated dining places qualify; prominence breaks ties.
    nearbyRestaurants.sort((first, second) =>
      (second.rating! - first.rating!) ||
      (second.user_ratings_total! - first.user_ratings_total!),
    );

    this.logger.log(
      `[LOCATION 7] ${nearbyRestaurants.length} restaurant cards kept`,
    );

    return nearbyRestaurants;
  }

  private async waitForPage(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  private async nearbyPages(params: URLSearchParams): Promise<GooglePlace[]> {
    let data = await this.callGoogleApi(`${this.baseUrl}/nearbysearch/json?${params}`);
    const results: GooglePlace[] = [...(data.results ?? [])];
    // Legacy Nearby Search exposes at most three pages per query.
    for (let page = 1; page < 3 && data.next_page_token; page++) {
      const nextParams = new URLSearchParams({
        pagetoken: data.next_page_token, key: this.apiKey,
      });
      let next;
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.waitForPage();
        next = await this.callGoogleApi(`${this.baseUrl}/nearbysearch/json?${nextParams}`, true);
        if (next.status !== 'INVALID_REQUEST') break;
      }
      if (next.status === 'INVALID_REQUEST') {
        this.logger.warn('Nearby search page was not ready after retries; returning available results');
        break;
      }
      results.push(...(next.results ?? []));
      data = next;
    }
    return results;
  }

  private diningRejection(place: GooglePlace): string | null {
    if (!Number.isFinite(place.rating) || (place.rating ?? 0) < 4 ||
        !Number.isFinite(place.user_ratings_total) || (place.user_ratings_total ?? 0) < 100) {
      return 'requires at least 4.0 stars and 100 reviews';
    }
    if (!place.types?.some((type) => type === 'restaurant' || type === 'cafe')) {
      return 'not categorized as a restaurant or cafe';
    }
    if (place.types.includes('lodging')) return 'lodging listing, not a dedicated dining listing';
    const name = place.name.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
    if (/\b(?:gaming|gamers?|esports|arcade|cyber|internet\s*cafe|suites?|serviced\s*apartments?|guest\s*house|hostel|residency)\b/u.test(name)) {
      return 'gaming, internet or accommodation venue';
    }
    if (/\bamma\s*(?:unavagam|unavakam|unavagu?m|canteen)\b/u.test(name) ||
        /அம்மா\s*உணவகம்/u.test(name)) {
      return 'Amma Unavagam/canteen';
    }
    // Names are a best-effort signal: Google also labels some stalls as cafes.
    return /\b(?:snacks?|chaat|chat|pani\s*puri|juice)\s*(?:shops?|stalls?|cent(?:er|re)s?|corners?|points?)?\b|\btea\s*(?:shops?|stalls?|kadai)\b/u.test(name)
      ? 'snack, tea-stall or juice-shop name' : null;
  }
}
