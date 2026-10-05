import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedPlace } from '../../model/entities/saved-place.entity';
import { SavePlaceDto } from './dto/save-place.dto';

@Injectable()
export class SavedPlacesService {
  constructor(@InjectRepository(SavedPlace) private readonly places: Repository<SavedPlace>) {}
  list(userId: string) { return this.places.find({ where: { userId }, order: { savedAt: 'DESC' } }); }
  async toggle(userId: string, dto: SavePlaceDto) {
    const existing = await this.places.findOneBy({ userId, externalId: dto.externalId });
    if (existing) { await this.places.remove(existing); return { saved: false }; }
    await this.places.save(this.places.create({ userId, externalId: dto.externalId, restaurantName: dto.restaurantName, address: dto.address ?? null }));
    return { saved: true };
  }
}
