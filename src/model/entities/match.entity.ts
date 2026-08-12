import { CreateDateColumn, Entity, JoinColumn, ManyToOne, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { Session } from './session.entity';

@Entity('matches')
@Unique('UQ_session_match_restaurant', ['sessionId', 'restaurantId'])
export class Match {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'session_id', type: 'bigint', unsigned: true })
  sessionId: string;

  @ManyToOne(() => Session, (session) => session.matches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'restaurant_id', type: 'bigint', unsigned: true })
  restaurantId: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.matches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @CreateDateColumn({ name: 'matched_at', type: 'timestamp' })
  matchedAt: Date;
}
