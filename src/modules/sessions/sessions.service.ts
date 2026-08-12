import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { Match } from '../../model/entities/match.entity';
import { Restaurant } from '../../model/entities/restaurant.entity';
import { SessionParticipant } from '../../model/entities/session-participant.entity';
import { SessionRestaurant } from '../../model/entities/session-restaurant.entity';
import { MatchRule, Session, SessionStatus } from '../../model/entities/session.entity';
import { Swipe, SwipeVote } from '../../model/entities/swipe.entity';
import { PlacesService } from '../places/places.service';
import { SessionsGateway } from './sessions.gateway';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(SessionParticipant) private readonly participants: Repository<SessionParticipant>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(SessionRestaurant) private readonly decks: Repository<SessionRestaurant>,
    @InjectRepository(Swipe) private readonly swipes: Repository<Swipe>,
    @InjectRepository(Match) private readonly matches: Repository<Match>,
    private readonly places: PlacesService,
    private readonly gateway: SessionsGateway,
  ) {}

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(
      { length: 5 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  private async findSessionOrFail(id: string): Promise<Session> {
    const session = await this.sessions.findOne({ where: { id }, relations: { finalRestaurant: true } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async findParticipantOrFail(sessionId: string, userId: string) {
    const participant = await this.participants.findOneBy({ sessionId, userId });
    if (!participant) throw new ForbiddenException('You are not a participant in this session');
    return participant;
  }

  async create(userId: string, dto: CreateSessionDto) {
    this.validateCreateSession(dto);

    let code = this.generateRoomCode();
    while (await this.sessions.existsBy({ roomCode: code })) {
      code = this.generateRoomCode();
    }

    const session = await this.sessions.save(this.sessions.create({
      roomCode: code,
      hostId: userId,
      locationName: dto.location.address,
      latitude: String(dto.location.latitude),
      longitude: String(dto.location.longitude),
      radiusKm: String(dto.radiusKm),
      priceFilter: dto.priceLevel.join(','),
      matchRule: dto.matchRule,
    }));
    await this.participants.save(this.participants.create({ sessionId: session.id, userId, isHost: true }));
    return { id: session.id, roomCode: session.roomCode, status: session.status, isHost: true };
  }

  async join(userId: string, rawCode: string) {
    if (!rawCode || !/^[a-zA-Z0-9]{5}$/.test(rawCode)) {
      throw new BadRequestException('roomCode must contain 5 letters or numbers');
    }

    const roomCode = rawCode.toUpperCase();
    const session = await this.sessions.findOneBy({ roomCode });
    if (!session || session.status !== SessionStatus.LOBBY) {
      throw new NotFoundException('Invalid or expired room code');
    }
    let participant = await this.participants.findOneBy({ sessionId: session.id, userId });
    if (!participant) {
      participant = await this.participants.save(this.participants.create({ sessionId: session.id, userId }));
      this.gateway.emitToSession(session.id, 'participantJoined', { userId });
    }
    return { sessionId: session.id, roomCode, status: session.status, isHost: participant.isHost };
  }

  async getOne(id: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const session = await this.findSessionOrFail(id);
    return { id: session.id, roomCode: session.roomCode, status: session.status, hostId: session.hostId };
  }

  async getParticipants(id: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const rows = await this.participants.find({ where: { sessionId: id }, relations: { user: true }, order: { joinedAt: 'ASC' } });
    return rows.map((row) => ({ id: row.user.id, displayName: row.user.displayName, avatar: row.user.avatar, isHost: row.isHost }));
  }

  async start(id: string, userId: string) {
    const session = await this.findSessionOrFail(id);
    if (session.hostId !== userId) throw new ForbiddenException('Only the host can start swiping');
    if (session.status !== SessionStatus.LOBBY) throw new BadRequestException('Session has already started');

    const places = await this.places.nearby(session.latitude, session.longitude, session.radiusKm, session.priceFilter);
    for (const [cardIndex, place] of places.entries()) {
      let restaurant = await this.restaurants.findOneBy({ googlePlaceId: place.place_id });
      if (!restaurant) {
        restaurant = await this.restaurants.save(this.restaurants.create({
          googlePlaceId: place.place_id,
          name: place.name,
          address: place.vicinity ?? null,
          latitude: place.geometry?.location?.lat == null ? null : String(place.geometry.location.lat),
          longitude: place.geometry?.location?.lng == null ? null : String(place.geometry.location.lng),
          rating: place.rating == null ? null : String(place.rating),
          priceLevel: place.price_level ?? null,
          photoReference: place.photos?.[0]?.photo_reference ?? null,
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        }));
      }
      if (!(await this.decks.existsBy({ sessionId: id, restaurantId: restaurant.id }))) {
        await this.decks.save(this.decks.create({ sessionId: id, restaurantId: restaurant.id, cardIndex }));
      }
    }
    session.status = SessionStatus.ACTIVE;
    await this.sessions.save(session);
    this.gateway.emitToSession(id, 'sessionStarted', { sessionId: id });
    return { sessionId: id, status: session.status, restaurantCount: places.length };
  }

  async getRestaurants(id: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const rows = await this.decks.find({ where: { sessionId: id }, relations: { restaurant: true }, order: { cardIndex: 'ASC' } });
    return rows.map(({ restaurant }) => this.restaurantResponse(restaurant));
  }

  async getRestaurant(id: string, restaurantId: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const row = await this.decks.findOne({ where: { sessionId: id, restaurantId }, relations: { restaurant: true } });
    if (!row) throw new NotFoundException('Restaurant not found in this session');
    return this.restaurantResponse(row.restaurant);
  }

  private restaurantResponse(restaurant: Restaurant) {
    return {
      id: restaurant.id,
      name: restaurant.name,
      rating: restaurant.rating == null ? null : Number(restaurant.rating),
      priceLevel: restaurant.priceLevel,
      address: restaurant.address,
      photoReference: restaurant.photoReference,
      latitude: restaurant.latitude == null ? null : Number(restaurant.latitude),
      longitude: restaurant.longitude == null ? null : Number(restaurant.longitude),
      googlePlaceId: restaurant.googlePlaceId,
      googleMapsUrl: restaurant.googleMapsUrl,
    };
  }

  async swipe(id: string, userId: string, restaurantId: string, vote: SwipeVote) {
    if (!restaurantId || !/^\d+$/.test(restaurantId)) {
      throw new BadRequestException('restaurantId must contain only numbers');
    }

    if (vote !== SwipeVote.YES && vote !== SwipeVote.NO) {
      throw new BadRequestException('vote must be YES or NO');
    }

    const session = await this.findSessionOrFail(id);
    await this.findParticipantOrFail(id, userId);
    if (session.status !== SessionStatus.ACTIVE) throw new BadRequestException('Session is not active');
    if (!(await this.decks.existsBy({ sessionId: id, restaurantId }))) throw new NotFoundException('Restaurant not found in deck');

    let swipe = await this.swipes.findOneBy({ sessionId: id, userId, restaurantId });
    if (swipe) swipe.vote = vote;
    else swipe = this.swipes.create({ sessionId: id, userId, restaurantId, vote });
    await this.swipes.save(swipe);

    if (vote === SwipeVote.NO) return { matched: false };
    const [yesCount, totalParticipants] = await Promise.all([
      this.swipes.countBy({ sessionId: id, restaurantId, vote: SwipeVote.YES }),
      this.participants.countBy({ sessionId: id }),
    ]);
    const required =
      session.matchRule === MatchRule.MAJORITY
        ? Math.floor(totalParticipants / 2) + 1
        : totalParticipants;
    if (yesCount < required) return { matched: false };

    let match = await this.matches.findOne({ where: { sessionId: id, restaurantId }, relations: { restaurant: true } });
    if (!match) {
      match = await this.matches.save(this.matches.create({ sessionId: id, restaurantId }));
      match = (await this.matches.findOne({ where: { id: match.id }, relations: { restaurant: true } }))!;
      this.gateway.emitToSession(id, 'matchFound', { matchId: match.id, restaurantId });
    }
    return { matched: true, match: { id: match.id, restaurantId, name: match.restaurant.name } };
  }

  async getMatch(id: string, matchId: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const match = await this.matches.findOne({ where: { id: matchId, sessionId: id }, relations: { restaurant: true } });
    if (!match) throw new NotFoundException('Match not found');
    const yesVotes = await this.swipes.find({ where: { sessionId: id, restaurantId: match.restaurantId, vote: SwipeVote.YES }, relations: { user: true } });
    return {
      id: match.id,
      restaurant: this.restaurantResponse(match.restaurant),
      yesVoters: yesVotes.map(({ user }) => ({ id: user.id, name: user.displayName, avatar: user.avatar })),
    };
  }

  async finalPick(id: string, userId: string, restaurantId: string) {
    if (!restaurantId || !/^\d+$/.test(restaurantId)) {
      throw new BadRequestException('restaurantId must contain only numbers');
    }

    const session = await this.findSessionOrFail(id);
    if (session.hostId !== userId) throw new ForbiddenException('Only the host can choose the final restaurant');
    const restaurant = await this.restaurants.findOneBy({ id: restaurantId });
    if (!restaurant || !(await this.decks.existsBy({ sessionId: id, restaurantId }))) throw new NotFoundException('Restaurant not found in deck');
    session.finalRestaurantId = restaurantId;
    session.status = SessionStatus.COMPLETED;
    await this.sessions.save(session);
    return { status: session.status, finalPick: { id: restaurant.id, name: restaurant.name } };
  }

  async results(id: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const session = await this.findSessionOrFail(id);
    const totalParticipants = await this.participants.countBy({ sessionId: id });
    const rows = await this.swipes.createQueryBuilder('swipe')
      .innerJoinAndSelect('swipe.restaurant', 'restaurant')
      .select(['restaurant.id AS restaurantId', 'restaurant.name AS restaurantName', 'COUNT(swipe.id) AS yesCount'])
      .where('swipe.session_id = :id', { id }).andWhere('swipe.vote = :vote', { vote: SwipeVote.YES })
      .groupBy('restaurant.id').addGroupBy('restaurant.name').orderBy('yesCount', 'DESC').getRawMany();
    const votes = rows.map((row) => ({ ...row, yesCount: Number(row.yesCount) }));
    const exactMatches = votes.filter((row) => row.yesCount === totalParticipants);
    return {
      finalPick: session.finalRestaurant ? { id: session.finalRestaurant.id, name: session.finalRestaurant.name } : null,
      matches: exactMatches,
      bestOverlap: exactMatches.length ? [] : votes.slice(0, 3).map((row) => ({ ...row, totalParticipants })),
    };
  }

  async history(userId: string, recentOnly = false) {
    const rows = await this.participants.find({
      where: { userId }, relations: { session: { finalRestaurant: true } },
      order: { joinedAt: 'DESC' }, take: recentOnly ? 5 : 50,
    });
    return rows.map(({ session }) => ({
      id: session.id, roomCode: session.roomCode, status: session.status,
      finalRestaurant: session.finalRestaurant?.name ?? null, restaurantName: session.finalRestaurant?.name ?? null,
      createdAt: session.createdAt,
    }));
  }

  private validateCreateSession(dto: CreateSessionDto) {
    if (!dto || !dto.location) {
      throw new BadRequestException('location is required');
    }

    const latitude = Number(dto.location.latitude);
    const longitude = Number(dto.location.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('latitude must be between -90 and 90');
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('longitude must be between -180 and 180');
    }

    if (!dto.location.address || typeof dto.location.address !== 'string') {
      throw new BadRequestException('location address is required');
    }

    if (typeof dto.radiusKm !== 'number' || dto.radiusKm < 0.1 || dto.radiusKm > 100) {
      throw new BadRequestException('radiusKm must be between 0.1 and 100');
    }

    if (!Array.isArray(dto.priceLevel) || dto.priceLevel.length === 0) {
      throw new BadRequestException('select at least one price level');
    }

    const hasInvalidPrice = dto.priceLevel.some(
      (price) => !Number.isInteger(price) || price < 0 || price > 4,
    );

    if (hasInvalidPrice) {
      throw new BadRequestException('priceLevel values must be between 0 and 4');
    }

    if (dto.matchRule !== MatchRule.ALL && dto.matchRule !== MatchRule.MAJORITY) {
      throw new BadRequestException('matchRule must be ALL or MAJORITY');
    }
  }
}
