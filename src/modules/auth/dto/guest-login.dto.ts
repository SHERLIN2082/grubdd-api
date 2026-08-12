import { ApiProperty } from '@nestjs/swagger';

export class GuestLoginDto {
  @ApiProperty({ example: 'phone-abc-123', description: 'Unique ID saved by the Flutter app on this device' })
  deviceId: string;
}
