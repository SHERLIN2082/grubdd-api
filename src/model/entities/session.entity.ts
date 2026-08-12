import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Match } from './match.entity';
import { Restaurant } from './restaurant.entity';
import { SessionParticipant } from './session-participant.entity';
import { SessionRestaurant } from './session-restaurant.entity';
import { Swipe } from './swipe.entity';
import { User } from './user.entity';

export enum SessionStatus {
  LOBBY = 'LOBBY',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'room_code', type: 'varchar', length: 5, unique: true })
  roomCode: string;

  @Column({ name: 'host_id', type: 'bigint', unsigned: true })
  hostId: string;

  @ManyToOne(() => User, (user) => user.hostedSessions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ name: 'location_name', type: 'varchar', length: 255, nullable: true })
  locationName: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: string;

  @Column({ name: 'radius_km', type: 'decimal', precision: 5, scale: 2 })
  radiusKm: string;

  @Column({ name: 'price_filter', type: 'varchar', length: 50, nullable: true })
  priceFilter: string | null;

  @Column({ name: 'match_rule', type: 'varchar', length: 30 })
  matchRule: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.LOBBY })
  status: SessionStatus;

  @Column({ name: 'final_restaurant_id', type: 'bigint', unsigned: true, nullable: true })
  finalRestaurantId: string | null;

  @ManyToOne(() => Restaurant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'final_restaurant_id' })
  finalRestaurant: Restaurant | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => SessionParticipant, (participant) => participant.session)
  participants: SessionParticipant[];

  @OneToMany(() => SessionRestaurant, (item) => item.session)
  sessionRestaurants: SessionRestaurant[];

  @OneToMany(() => Swipe, (swipe) => swipe.session)
  swipes: Swipe[];

  @OneToMany(() => Match, (match) => match.session)
  matches: Match[];
}
