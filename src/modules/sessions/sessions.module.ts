import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PlacesModule } from '../places/places.module';
import { Match } from '../../model/entities/match.entity';
import { Restaurant } from '../../model/entities/restaurant.entity';
import { SessionParticipant } from '../../model/entities/session-participant.entity';
import { SessionRestaurant } from '../../model/entities/session-restaurant.entity';
import { Session } from '../../model/entities/session.entity';
import { Swipe } from '../../model/entities/swipe.entity';
import { SessionsController } from './sessions.controller';
import { SessionsGateway } from './sessions.gateway';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session, SessionParticipant, Restaurant, SessionRestaurant, Swipe, Match]), AuthModule, PlacesModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsGateway],
})
export class SessionsModule {}
