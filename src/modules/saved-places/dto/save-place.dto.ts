import { IsOptional, IsString, MinLength } from 'class-validator';

export class SavePlaceDto {
  @IsString() @MinLength(1) externalId: string;
  @IsString() @MinLength(1) restaurantName: string;
  @IsOptional() @IsString() address?: string;
}
