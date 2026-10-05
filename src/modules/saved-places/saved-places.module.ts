import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedPlace } from '../../model/entities/saved-place.entity';
import { SavedPlacesController } from './saved-places.controller';
import { SavedPlacesService } from './saved-places.service';

@Module({ imports: [TypeOrmModule.forFeature([SavedPlace])], controllers: [SavedPlacesController], providers: [SavedPlacesService] })
export class SavedPlacesModule {}
