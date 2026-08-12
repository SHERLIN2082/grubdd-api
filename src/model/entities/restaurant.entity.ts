import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Match } from './match.entity';
import { SessionRestaurant } from './session-restaurant.entity';
import { Swipe } from './swipe.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'google_place_id', type: 'varchar', length: 255, unique: true })
  googlePlaceId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating: string | null;

  @Column({ name: 'price_level', type: 'tinyint', unsigned: true, nullable: true })
  priceLevel: number | null;

  @Column({ name: 'photo_reference', type: 'text', nullable: true })
  photoReference: string | null;

  @Column({ name: 'google_maps_url', type: 'text', nullable: true })
  googleMapsUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => SessionRestaurant, (item) => item.restaurant)
  sessionRestaurants: SessionRestaurant[];

  @OneToMany(() => Swipe, (swipe) => swipe.restaurant)
  swipes: Swipe[];

  @OneToMany(() => Match, (match) => match.restaurant)
  matches: Match[];
}
