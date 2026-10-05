import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodTrailVisit } from '../../model/entities/food-trail-visit.entity';
import { CreateVisitDto } from './dto/create-visit.dto';

@Injectable()
export class FoodTrailService {
  constructor(@InjectRepository(FoodTrailVisit) private readonly visits: Repository<FoodTrailVisit>) {}
  list(userId: string) { return this.visits.find({ where: { userId }, order: { visitedAt: 'DESC' } }); }
  create(userId: string, dto: CreateVisitDto) {
    return this.visits.save(this.visits.create({ userId, restaurantName: dto.restaurantName, address: dto.address ?? null, latitude: dto.latitude ?? null, longitude: dto.longitude ?? null }));
  }
}
