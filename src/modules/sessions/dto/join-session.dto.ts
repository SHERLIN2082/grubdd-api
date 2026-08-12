import { ApiProperty } from '@nestjs/swagger';

export class JoinSessionDto {
  @ApiProperty({ example: 'A7B2C', minLength: 5, maxLength: 5 })
  roomCode: string;
}
