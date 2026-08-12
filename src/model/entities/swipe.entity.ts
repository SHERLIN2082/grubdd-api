import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { Session } from './session.entity';
import { User } from './user.entity';

export enum SwipeVote {
  YES = 'YES',
  NO = 'NO',
}

@Entity('swipes')
@Unique('UQ_session_user_restaurant_swipe', ['sessionId', 'userId', 'restaurantId'])
export class Swipe {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'session_id', type: 'bigint', unsigned: true })
  sessionId: string;

  @ManyToOne(() => Session, (session) => session.swipes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.swipes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'restaurant_id', type: 'bigint', unsigned: true })
  restaurantId: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.swipes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'enum', enum: SwipeVote })
  vote: SwipeVote;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
