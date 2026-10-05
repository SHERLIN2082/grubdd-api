import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateVisitDto {
  @IsString()
  @MinLength(1)
  restaurantName: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;
}
