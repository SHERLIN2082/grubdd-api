import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateSwipeDto } from './dto/create-swipe.dto';
import { FinalPickDto } from './dto/final-pick.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiTags('Sessions')
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a session' })
  @ApiBody({ type: CreateSessionDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSessionDto) {
    return this.sessions.create(user.id, dto);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a session using its room code' })
  @ApiBody({ type: JoinSessionDto })
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinSessionDto) {
    return this.sessions.join(user.id, dto.roomCode);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get my five most recent sessions' })
  recent(@CurrentUser() user: AuthUser) {
    return this.sessions.history(user.id, true);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get my session history' })
  history(@CurrentUser() user: AuthUser) {
    return this.sessions.history(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one session' })
  one(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sessions.getOne(id, user.id);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get lobby participants' })
  participants(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sessions.getParticipants(id, user.id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start swiping (host only)' })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sessions.start(id, user.id);
  }

  @Get(':id/restaurants')
  @ApiOperation({ summary: 'Get the restaurant card deck' })
  restaurants(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sessions.getRestaurants(id, user.id);
  }

  @Get(':id/restaurants/:restaurantId')
  @ApiOperation({ summary: 'Get one restaurant from the deck' })
  restaurant(@Param('id') id: string, @Param('restaurantId') restaurantId: string, @CurrentUser() user: AuthUser) {
    return this.sessions.getRestaurant(id, restaurantId, user.id);
  }

  @Post(':id/swipes')
  @ApiOperation({ summary: 'Submit a YES or NO vote' })
  @ApiBody({ type: CreateSwipeDto })
  swipe(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: CreateSwipeDto) {
    return this.sessions.swipe(id, user.id, dto.restaurantId, dto.vote);
  }

  @Get(':id/matches/:matchId')
  @ApiOperation({ summary: 'Get match details and YES voters' })
  match(@Param('id') id: string, @Param('matchId') matchId: string, @CurrentUser() user: AuthUser) {
    return this.sessions.getMatch(id, matchId, user.id);
  }

  @Post(':id/final-pick')
  @ApiOperation({ summary: 'Choose the final restaurant (host only)' })
  @ApiBody({ type: FinalPickDto })
  finalPick(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: FinalPickDto) {
    return this.sessions.finalPick(id, user.id, dto.restaurantId);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get session results' })
  results(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sessions.results(id, user.id);
  }
}
