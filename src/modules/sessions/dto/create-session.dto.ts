import { ApiProperty } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({ example: 13.0827 })
  latitude: number;

  @ApiProperty({ example: 80.2707 })
  longitude: number;

  @ApiProperty({ example: 'Chennai' })
  address: string;
}

export class CreateSessionDto {
  @ApiProperty({ type: LocationDto })
  location: LocationDto;

  @ApiProperty({ example: 5, minimum: 0.1, maximum: 100 })
  radiusKm: number;

  @ApiProperty({ example: [1, 2], type: [Number] })
  priceLevel: number[];

  @ApiProperty({ example: 'ALL', enum: ['ALL', 'MAJORITY'] })
  matchRule: string;
}
