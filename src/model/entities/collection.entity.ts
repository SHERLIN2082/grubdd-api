import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('collections')
export class Collection {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id: string;
  @Column({ name: 'user_id', type: 'bigint', unsigned: true }) userId: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'place_ids', type: 'simple-json', nullable: true }) placeIds: string[] | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt: Date;
}
