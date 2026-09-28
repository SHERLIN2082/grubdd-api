import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({ example: 'Vegetarian' })
  foodPreference: string;
}
