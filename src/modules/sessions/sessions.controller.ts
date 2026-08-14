import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../../common/interfaces/auth-request.interface';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateSwipeDto } from './dto/create-swipe.dto';
import { FinalPickDto } from './dto/final-pick.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@ApiTags('Sessions')
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a session' })
  @ApiBody({ type: CreateSessionDto })
  create(@Req() request: AuthRequest, @Body() dto: CreateSessionDto) {
    return this.sessions.create(request.user.id, dto);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a session using its room code' })
  @ApiBody({ type: JoinSessionDto })
  join(@Req() request: AuthRequest, @Body() dto: JoinSessionDto) {
    return this.sessions.join(request.user.id, dto.roomCode);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get my five most recent sessions' })
  recent(@Req() request: AuthRequest) {
    return this.sessions.history(request.user.id, true);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get my session history' })
  history(@Req() request: AuthRequest) {
    return this.sessions.history(request.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one session' })
  one(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.sessions.getOne(id, request.user.id);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get lobby participants' })
  participants(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.sessions.getParticipants(id, request.user.id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start swiping (host only)' })
  start(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.sessions.start(id, request.user.id);
  }

  @Get(':id/restaurants')
  @ApiOperation({ summary: 'Get the restaurant card deck' })
  restaurants(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.sessions.getRestaurants(id, request.user.id);
  }

  @Get(':id/restaurants/:restaurantId')
  @ApiOperation({ summary: 'Get one restaurant from the deck' })
  restaurant(@Param('id') id: string, @Param('restaurantId') restaurantId: string, @Req() request: AuthRequest) {
    return this.sessions.getRestaurant(id, restaurantId, request.user.id);
  }

  @Post(':id/swipes')
  @ApiOperation({ summary: 'Submit a YES or NO vote' })
  @ApiBody({ type: CreateSwipeDto })
  swipe(@Param('id') id: string, @Req() request: AuthRequest, @Body() dto: CreateSwipeDto) {
    return this.sessions.swipe(id, request.user.id, dto.restaurantId, dto.vote);
  }

  @Get(':id/matches/:matchId')
  @ApiOperation({ summary: 'Get match details and YES voters' })
  match(@Param('id') id: string, @Param('matchId') matchId: string, @Req() request: AuthRequest) {
    return this.sessions.getMatch(id, matchId, request.user.id);
  }

  @Post(':id/final-pick')
  @ApiOperation({ summary: 'Choose the final restaurant (host only)' })
  @ApiBody({ type: FinalPickDto })
  finalPick(@Param('id') id: string, @Req() request: AuthRequest, @Body() dto: FinalPickDto) {
    return this.sessions.finalPick(id, request.user.id, dto.restaurantId);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get session results' })
  results(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.sessions.results(id, request.user.id);
  }
}
