import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Sherlin' })
  displayName: string;

  @ApiPropertyOptional({ example: '😊' })
  avatar?: string;
}
