import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('food_trail_visits')
export class FoodTrailVisit {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id: string;
  @Column({ name: 'user_id', type: 'bigint', unsigned: true }) userId: string;
  @Column({ name: 'restaurant_name', type: 'varchar', length: 255 }) restaurantName: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) address: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) latitude: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) longitude: number | null;
  @CreateDateColumn({ name: 'visited_at', type: 'timestamp' }) visitedAt: Date;
}
