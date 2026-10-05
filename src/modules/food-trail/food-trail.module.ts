import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodTrailVisit } from '../../model/entities/food-trail-visit.entity';
import { FoodTrailController } from './food-trail.controller';
import { FoodTrailService } from './food-trail.service';

@Module({ imports: [TypeOrmModule.forFeature([FoodTrailVisit])], controllers: [FoodTrailController], providers: [FoodTrailService] })
export class FoodTrailModule {}
