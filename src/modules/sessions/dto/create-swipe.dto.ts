import { ApiProperty } from '@nestjs/swagger';
import { SwipeVote } from '../../../model/entities/swipe.entity';

export class CreateSwipeDto {
  @ApiProperty({ example: '101', description: 'Restaurant ID from the session deck' })
  restaurantId: string;

  @ApiProperty({ example: SwipeVote.YES, enum: SwipeVote })
  vote: SwipeVote;
}
