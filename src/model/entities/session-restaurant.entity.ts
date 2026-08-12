import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { Session } from './session.entity';

@Entity('session_restaurants')
@Unique('UQ_session_restaurant', ['sessionId', 'restaurantId'])
export class SessionRestaurant {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'session_id', type: 'bigint', unsigned: true })
  sessionId: string;

  @ManyToOne(() => Session, (session) => session.sessionRestaurants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'restaurant_id', type: 'bigint', unsigned: true })
  restaurantId: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.sessionRestaurants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'card_index', type: 'int' })
  cardIndex: number;
}
