import { ApiProperty } from '@nestjs/swagger';

export class ReverseGeocodeQueryDto {
  @ApiProperty({ example: 13.0827 })
  lat: number;

  @ApiProperty({ example: 80.2707 })
  lng: number;
}
