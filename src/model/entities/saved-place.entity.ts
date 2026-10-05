import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('saved_places')
@Unique('UQ_saved_place_user_external', ['userId', 'externalId'])
export class SavedPlace {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id: string;
  @Column({ name: 'user_id', type: 'bigint', unsigned: true }) userId: string;
  @Column({ name: 'external_id', type: 'varchar', length: 255 }) externalId: string;
  @Column({ name: 'restaurant_name', type: 'varchar', length: 255 }) restaurantName: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) address: string | null;
  @CreateDateColumn({ name: 'saved_at', type: 'timestamp' }) savedAt: Date;
}
