import { ApiProperty } from '@nestjs/swagger';

export class FinalPickDto {
  @ApiProperty({ example: '101' })
  restaurantId: string;
}
