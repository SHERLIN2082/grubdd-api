import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id: string;
  @Column({ name: 'owner_id', type: 'bigint', unsigned: true }) ownerId: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'member_ids', type: 'simple-json', nullable: true }) memberIds: string[] | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt: Date;
}
