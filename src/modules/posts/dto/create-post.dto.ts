import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePostDto {
  @IsString()
  restaurantName: string;

  @IsString()
  story: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dishes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vibes?: string[];
}
