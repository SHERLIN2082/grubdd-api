import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { Match } from '../../model/entities/match.entity';
import { Restaurant } from '../../model/entities/restaurant.entity';
import { SessionParticipant } from '../../model/entities/session-participant.entity';
import { SessionRestaurant } from '../../model/entities/session-restaurant.entity';
import { MatchRule, Session, SessionStatus } from '../../model/entities/session.entity';
import { Swipe, SwipeVote } from '../../model/entities/swipe.entity';
import { GooglePlace, PlacesService } from '../places/places.service';
import { SessionsGateway } from './sessions.gateway';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(SessionParticipant)
    private readonly participants: Repository<SessionParticipant>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(SessionRestaurant)
    private readonly decks: Repository<SessionRestaurant>,
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

  private normalizePlaceText(value?: string | null): string {
    return (value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private calculateDistanceKm(
    firstLatitude: number,
    firstLongitude: number,
    secondLatitude: number,
    secondLongitude: number,
  ): number {
    const earthRadiusKm = 6371;
    const toRadians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDifference = toRadians(secondLatitude - firstLatitude);
    const longitudeDifference = toRadians(secondLongitude - firstLongitude);

    const value =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(toRadians(firstLatitude)) *
        Math.cos(toRadians(secondLatitude)) *
        Math.sin(longitudeDifference / 2) ** 2;

    const angle = 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
    return earthRadiusKm * angle;
  }

  private samePhysicalRestaurant(
    first: {
      name: string;
      address?: string | null;
      latitude?: string | number | null;
      longitude?: string | number | null;
    },
    second: {
      name: string;
      address?: string | null;
      latitude?: string | number | null;
      longitude?: string | number | null;
    },
  ): boolean {
    const firstName = this.normalizePlaceText(first.name);
    const secondName = this.normalizePlaceText(second.name);

    if (firstName !== secondName) {
      return false;
    }

    const firstAddress = this.normalizePlaceText(first.address);
    const secondAddress = this.normalizePlaceText(second.address);
    if (firstAddress && secondAddress && firstAddress === secondAddress) {
      return true;
    }

    const firstLatitude = Number(first.latitude);
    const firstLongitude = Number(first.longitude);
    const secondLatitude = Number(second.latitude);
    const secondLongitude = Number(second.longitude);
    const coordinates = [
      firstLatitude,
      firstLongitude,
      secondLatitude,
      secondLongitude,
    ];
    const hasValidCoordinates = coordinates.every(Number.isFinite);

    if (!hasValidCoordinates) {
      return false;
    }

    // Roughly 100 metres, which catches duplicate listings without hiding
    // separate branches of the same restaurant chain.
    const latitudeIsClose = Math.abs(firstLatitude - secondLatitude) < 0.0009;
    const longitudeIsClose = Math.abs(firstLongitude - secondLongitude) < 0.0009;
    return latitudeIsClose && longitudeIsClose;
  }

  private sameRestaurantName(first: { name: string }, second: { name: string }): boolean {
    return this.normalizePlaceText(first.name) === this.normalizePlaceText(second.name);
  }

  private removeDuplicatePlaces(places: GooglePlace[]): GooglePlace[] {
    const uniquePlaces: GooglePlace[] = [];

    for (const place of places) {
      const isDuplicate = uniquePlaces.some((savedPlace) => {
        if (this.sameRestaurantName(savedPlace, place)) {
          return true;
        }

        return this.samePhysicalRestaurant(
          {
            name: savedPlace.name,
            address: savedPlace.vicinity,
            latitude: savedPlace.geometry?.location.lat,
            longitude: savedPlace.geometry?.location.lng,
          },
          {
            name: place.name,
            address: place.vicinity,
            latitude: place.geometry?.location.lat,
            longitude: place.geometry?.location.lng,
          },
        );
      });

      if (!isDuplicate) {
        uniquePlaces.push(place);
      }
    }

    return uniquePlaces;
  }

  private async findSessionOrFail(id: string): Promise<Session> {
    const session = await this.sessions.findOne({
      where: { id },
      relations: { finalRestaurant: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private async findParticipantOrFail(sessionId: string, userId: string) {
    const participant = await this.participants.findOneBy({ sessionId, userId });
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    return participant;
  }

  async create(userId: string, dto: CreateSessionDto) {
    this.validateCreateSession(dto);

    this.logger.log(
      `[LOCATION 3] Creating session at ${dto.location.address} ` +
      `(${dto.location.latitude}, ${dto.location.longitude}), ` +
      `radius: ${dto.radiusKm} km`,
    );

    let code = this.generateRoomCode();
    while (await this.sessions.existsBy({ roomCode: code })) {
      code = this.generateRoomCode();
    }

    const newSession = this.sessions.create({
      roomCode: code,
      hostId: userId,
      locationName: dto.location.address,
      latitude: String(dto.location.latitude),
      longitude: String(dto.location.longitude),
      radiusKm: String(dto.radiusKm),
      priceFilter: dto.priceLevel.join(','),
      matchRule: dto.matchRule,
    });
    const session = await this.sessions.save(newSession);

    const host = this.participants.create({
      sessionId: session.id,
      userId,
      isHost: true,
    });
    await this.participants.save(host);

    return {
      id: session.id,
      roomCode: session.roomCode,
      status: session.status,
      isHost: true,
    };
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
    let participant = await this.participants.findOneBy({
      sessionId: session.id,
      userId,
    });

    if (!participant) {
      const newParticipant = this.participants.create({
        sessionId: session.id,
        userId,
      });
      participant = await this.participants.save(newParticipant);
      this.gateway.emitToSession(session.id, 'participantJoined', { userId });
    }

    return {
      sessionId: session.id,
      roomCode,
      status: session.status,
      isHost: participant.isHost,
    };
  }

  async getOne(id: string, userId: string) {
    const participant = await this.findParticipantOrFail(id, userId);
    const session = await this.findSessionOrFail(id);
    const hostLeft =
      session.status === SessionStatus.COMPLETED &&
      session.finalRestaurantId === null;
    const priceLevels: number[] = [];
    const savedPrices = session.priceFilter?.split(',') ?? [];

    for (const savedPrice of savedPrices) {
      if (savedPrice) {
        priceLevels.push(Number(savedPrice));
      }
    }

    return {
      id: session.id,
      roomCode: session.roomCode,
      status: hostLeft ? 'HOST_LEFT' : session.status,
      hostId: session.hostId,
      isHost: participant.isHost,
      locationName: session.locationName,
      radiusKm: Number(session.radiusKm),
      priceLevel: priceLevels,
      matchRule: session.matchRule,
    };
  }

  async getParticipants(id: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const participants = await this.participants.find({
      where: { sessionId: id },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });

    const participantList = [];

    for (const participant of participants) {
      participantList.push({
        id: participant.user.id,
        displayName: participant.user.displayName,
        avatar: participant.user.avatar,
        isHost: participant.isHost,
      });
    }

    return participantList;
  }

  async leave(id: string, userId: string) {
    const session = await this.findSessionOrFail(id);
    const participant = await this.findParticipantOrFail(id, userId);

    if (participant.isHost) {
      session.status = SessionStatus.COMPLETED;
      await this.sessions.save(session);

      this.gateway.emitToSession(id, 'sessionClosed', {
        sessionId: id,
        reason: 'HOST_LEFT',
      });

      return { hostLeft: true, status: session.status };
    }

    await this.participants.remove(participant);
    this.gateway.emitToSession(id, 'participantLeft', { userId });
    return { hostLeft: false, status: session.status };
  }

  async start(id: string, userId: string) {
    const session = await this.findSessionOrFail(id);
    if (session.hostId !== userId) {
      throw new ForbiddenException('Only the host can start swiping');
    }
    if (session.status !== SessionStatus.LOBBY) {
      throw new BadRequestException('Session has already started');
    }

    const participantCount = await this.participants.countBy({ sessionId: id });
    if (participantCount < 1) {
      throw new BadRequestException('At least one participant is required to start');
    }

    const nearbyPlaces = await this.places.nearby(
      session.latitude,
      session.longitude,
      session.radiusKm,
      session.priceFilter,
    );
    const places = this.removeDuplicatePlaces(nearbyPlaces);
    for (const [cardIndex, place] of places.entries()) {
      let restaurant = await this.restaurants.findOneBy({
        googlePlaceId: place.place_id,
      });
      if (!restaurant) {
        restaurant = this.restaurants.create({ googlePlaceId: place.place_id });
      }

      // Nearby-search data is the source of truth for the current branch. Refresh
      // cached rows so a previously stored address or coordinate cannot leak into
      // a newly created session's cards.
      restaurant.name = place.name;
      restaurant.address = place.vicinity ?? null;
      restaurant.latitude = place.geometry?.location.lat == null
        ? null
        : String(place.geometry.location.lat);
      restaurant.longitude = place.geometry?.location.lng == null
        ? null
        : String(place.geometry.location.lng);
      restaurant.rating = place.rating == null ? null : String(place.rating);
      restaurant.priceLevel = place.price_level ?? null;
      restaurant.photoReference = place.photos?.[0]?.photo_reference ?? null;
      restaurant.googleMapsUrl =
        `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
      restaurant = await this.restaurants.save(restaurant);

      const isAlreadyInDeck = await this.decks.existsBy({
        sessionId: id,
        restaurantId: restaurant.id,
      });

      if (!isAlreadyInDeck) {
        const deckItem = this.decks.create({
          sessionId: id,
          restaurantId: restaurant.id,
          cardIndex,
        });
        await this.decks.save(deckItem);
      }
    }
    session.status = SessionStatus.ACTIVE;
    await this.sessions.save(session);

    this.logger.log(
      `[LOCATION 8] Session ${id} started with ${places.length} restaurant cards`,
    );
    this.gateway.emitToSession(id, 'sessionStarted', { sessionId: id });
    return { sessionId: id, status: session.status, restaurantCount: places.length };
  }

  async getRestaurants(id: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const deckItems = await this.decks.find({
      where: { sessionId: id },
      relations: { restaurant: true },
      order: { cardIndex: 'ASC' },
    });
    const uniqueRestaurants: Restaurant[] = [];

    for (const deckItem of deckItems) {
      const restaurant = deckItem.restaurant;
      const isDuplicate = uniqueRestaurants.some((savedRestaurant) => {
        return savedRestaurant.id === restaurant.id
          || this.sameRestaurantName(savedRestaurant, restaurant)
          || this.samePhysicalRestaurant(savedRestaurant, restaurant);
      });

      if (!isDuplicate) {
        uniqueRestaurants.push(restaurant);
      }
    }

    const restaurantList = [];

    for (const restaurant of uniqueRestaurants) {
      restaurantList.push(this.restaurantResponse(restaurant));
    }

    return restaurantList;
  }

  async getRestaurant(id: string, restaurantId: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const deckItem = await this.decks.findOne({
      where: { sessionId: id, restaurantId },
      relations: { restaurant: true },
    });

    if (!deckItem) {
      throw new NotFoundException('Restaurant not found in this session');
    }

    return this.restaurantResponse(deckItem.restaurant);
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
    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active');
    }

    const restaurantIsInDeck = await this.decks.existsBy({
      sessionId: id,
      restaurantId,
    });
    if (!restaurantIsInDeck) {
      throw new NotFoundException('Restaurant not found in deck');
    }

    let swipe = await this.swipes.findOneBy({
      sessionId: id,
      userId,
      restaurantId,
    });

    if (swipe) {
      swipe.vote = vote;
    } else {
      swipe = this.swipes.create({ sessionId: id, userId, restaurantId, vote });
    }
    await this.swipes.save(swipe);

    if (vote === SwipeVote.NO) {
      return { matched: false };
    }

    const yesCount = await this.swipes.countBy({
      sessionId: id,
      restaurantId,
      vote: SwipeVote.YES,
    });
    const totalParticipants = await this.participants.countBy({ sessionId: id });

    // A solo user's YES vote is saved, but it should not immediately open the
    // group-match screen. Solo choices are shown after the deck is finished.
    if (totalParticipants < 2) {
      return { matched: false };
    }

    let requiredVotes = totalParticipants;
    if (session.matchRule === MatchRule.MAJORITY) {
      requiredVotes = Math.floor(totalParticipants / 2) + 1;
    }

    if (yesCount < requiredVotes) {
      return { matched: false };
    }

    let match = await this.matches.findOne({
      where: { sessionId: id, restaurantId },
      relations: { restaurant: true },
    });

    if (!match) {
      const newMatch = this.matches.create({ sessionId: id, restaurantId });
      const savedMatch = await this.matches.save(newMatch);
      match = await this.matches.findOne({
        where: { id: savedMatch.id },
        relations: { restaurant: true },
      });

      if (!match) {
        throw new NotFoundException('Match could not be loaded');
      }

      this.gateway.emitToSession(id, 'matchFound', { matchId: match.id, restaurantId });
    }

    return {
      matched: true,
      match: {
        id: match.id,
        restaurantId,
        name: match.restaurant.name,
      },
    };
  }

  async getMatch(id: string, matchId: string, userId: string) {
    const participant = await this.findParticipantOrFail(id, userId);
    const match = await this.matches.findOne({
      where: { id: matchId, sessionId: id },
      relations: { restaurant: true },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const yesVotes = await this.swipes.find({
      where: {
        sessionId: id,
        restaurantId: match.restaurantId,
        vote: SwipeVote.YES,
      },
      relations: { user: true },
    });

    const yesVoters = [];
    for (const yesVote of yesVotes) {
      yesVoters.push({
        id: yesVote.user.id,
        name: yesVote.user.displayName,
        avatar: yesVote.user.avatar,
      });
    }

    return {
      id: match.id,
      isHost: participant.isHost,
      restaurant: this.restaurantResponse(match.restaurant),
      yesVoters,
    };
  }

  async getLatestMatch(id: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const participantCount = await this.participants.countBy({ sessionId: id });

    if (participantCount < 2) {
      return null;
    }

    const match = await this.matches.findOne({
      where: { sessionId: id },
      order: { matchedAt: 'DESC' },
    });
    return match ? { id: match.id } : null;
  }

  async finalPick(id: string, userId: string, restaurantId: string) {
    if (!restaurantId || !/^\d+$/.test(restaurantId)) {
      throw new BadRequestException('restaurantId must contain only numbers');
    }

    const session = await this.findSessionOrFail(id);
    if (session.hostId !== userId) {
      throw new ForbiddenException('Only the host can choose the final restaurant');
    }

    const restaurant = await this.restaurants.findOneBy({ id: restaurantId });
    const restaurantIsInDeck = await this.decks.existsBy({
      sessionId: id,
      restaurantId,
    });

    if (!restaurant || !restaurantIsInDeck) {
      throw new NotFoundException('Restaurant not found in deck');
    }

    session.finalRestaurantId = restaurantId;
    session.status = SessionStatus.COMPLETED;
    await this.sessions.save(session);

    return {
      status: session.status,
      finalPick: {
        id: restaurant.id,
        name: restaurant.name,
      },
    };
  }

  async results(id: string, userId: string) {
    await this.findParticipantOrFail(id, userId);
    const session = await this.findSessionOrFail(id);
    const totalParticipants = await this.participants.countBy({ sessionId: id });

    const yesSwipes = await this.swipes.find({
      where: { sessionId: id, vote: SwipeVote.YES },
      relations: { restaurant: true },
    });

    const restaurantVotes = new Map<
      string,
      { restaurant: Restaurant; yesCount: number }
    >();

    for (const swipe of yesSwipes) {
      const savedResult = restaurantVotes.get(swipe.restaurantId);

      if (savedResult) {
        savedResult.yesCount += 1;
      } else {
        restaurantVotes.set(swipe.restaurantId, {
          restaurant: swipe.restaurant,
          yesCount: 1,
        });
      }
    }

    const voteResults = [];

    for (const result of restaurantVotes.values()) {
      const restaurantLatitude = Number(result.restaurant.latitude);
      const restaurantLongitude = Number(result.restaurant.longitude);
      let distanceKm: number | null = null;

      const hasValidLocation =
        Number.isFinite(restaurantLatitude)
        && Number.isFinite(restaurantLongitude);

      if (hasValidLocation) {
        distanceKm = this.calculateDistanceKm(
          Number(session.latitude),
          Number(session.longitude),
          restaurantLatitude,
          restaurantLongitude,
        );
      }

      voteResults.push({
        restaurantId: result.restaurant.id,
        restaurantName: result.restaurant.name,
        yesCount: result.yesCount,
        totalParticipants,
        rating: result.restaurant.rating == null
          ? null
          : Number(result.restaurant.rating),
        address: result.restaurant.address,
        photoReference: result.restaurant.photoReference,
        googleMapsUrl: result.restaurant.googleMapsUrl,
        distanceKm,
      });
    }

    voteResults.sort((first, second) => {
      if (first.yesCount !== second.yesCount) {
        return second.yesCount - first.yesCount;
      }
      return (second.rating ?? 0) - (first.rating ?? 0);
    });

    const exactMatches = [];
    for (const result of voteResults) {
      if (result.yesCount === totalParticipants) {
        exactMatches.push(result);
      }
    }

    return {
      finalPick: session.finalRestaurant
        ? {
            id: session.finalRestaurant.id,
            name: session.finalRestaurant.name,
          }
        : null,
      matches: exactMatches,
      bestOverlap: exactMatches.length > 0 ? [] : voteResults.slice(0, 3),
    };
  }

  async history(userId: string, recentOnly = false) {
    const maximumResults = recentOnly ? 5 : 50;
    const participantRows = await this.participants.find({
      where: { userId },
      relations: { session: { finalRestaurant: true } },
      order: { joinedAt: 'DESC' },
      take: maximumResults,
    });

    const sessionsById = new Map<string, Session>();
    for (const participant of participantRows) {
      sessionsById.set(participant.session.id, participant.session);
    }

    const uniqueSessions = Array.from(sessionsById.values());

    const history = [];
    for (const session of uniqueSessions) {
      history.push({
        id: session.id,
        roomCode: session.roomCode,
        status: session.status,
        finalRestaurant: session.finalRestaurant?.name ?? null,
        restaurantName: session.finalRestaurant?.name ?? null,
        createdAt: session.createdAt,
      });
    }

    return history;
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

    const radiusIsInvalid =
      typeof dto.radiusKm !== 'number'
      || dto.radiusKm < 0.1
      || dto.radiusKm > 100;

    if (radiusIsInvalid) {
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

    const matchRuleIsInvalid =
      dto.matchRule !== MatchRule.ALL
      && dto.matchRule !== MatchRule.MAJORITY;

    if (matchRuleIsInvalid) {
      throw new BadRequestException('matchRule must be ALL or MAJORITY');
    }
  }
}
