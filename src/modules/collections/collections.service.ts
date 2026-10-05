import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../../model/entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(@InjectRepository(Collection) private readonly collections: Repository<Collection>) {}

  list(userId: string) {
    return this.collections.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  create(userId: string, dto: CreateCollectionDto) {
    return this.collections.save(this.collections.create({
      userId,
      name: dto.name,
      description: dto.description ?? null,
      placeIds: dto.placeIds ?? [],
    }));
  }

  async getOne(id: string, userId: string) {
    const collection = await this.collections.findOneBy({ id, userId });
    if (!collection) throw new NotFoundException('Collection not found');
    return collection;
  }

  async update(id: string, userId: string, dto: UpdateCollectionDto) {
    const collection = await this.getOne(id, userId);
    Object.assign(collection, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.placeIds !== undefined ? { placeIds: dto.placeIds } : {}),
    });
    return this.collections.save(collection);
  }

  async remove(id: string, userId: string) {
    const collection = await this.getOne(id, userId);
    await this.collections.remove(collection);
    return { deleted: true, id };
  }
}
