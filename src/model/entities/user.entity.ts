import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Session } from './session.entity';
import { SessionParticipant } from './session-participant.entity';
import { Swipe } from './swipe.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'device_id', type: 'varchar', length: 255, unique: true })
  deviceId: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  avatar: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => Session, (session) => session.host)
  hostedSessions: Session[];

  @OneToMany(() => SessionParticipant, (participant) => participant.user)
  sessionParticipants: SessionParticipant[];

  @OneToMany(() => Swipe, (swipe) => swipe.user)
  swipes: Swipe[];
}
