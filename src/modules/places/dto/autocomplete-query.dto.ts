import { ApiProperty } from '@nestjs/swagger';

export class AutocompleteQueryDto {
  @ApiProperty({ example: 'Anna Nagar' })
  query: string;
}
