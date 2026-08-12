import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../model/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async loginAsGuest(deviceId: string) {
    if (!deviceId || typeof deviceId !== 'string') {
      throw new BadRequestException('deviceId is required');
    }

    if (deviceId.length > 255) {
      throw new BadRequestException('deviceId is too long');
    }

    const user = await this.findOrCreateGuest(deviceId);
    const accessToken = await this.createAccessToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        isProfileCompleted: Boolean(user.displayName),
      },
    };
  }

  private async findOrCreateGuest(deviceId: string): Promise<User> {
    const existingUser = await this.userRepository.findOneBy({ deviceId });

    if (existingUser) {
      return existingUser;
    }

    const newUser = this.userRepository.create({ deviceId });
    return this.userRepository.save(newUser);
  }

  private createAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      { id: user.id, deviceId: user.deviceId },
      {
        secret: this.configService.get<string>('JWT_SECRET', 'dev-secret'),
        expiresIn: '30d',
      },
    );
  }
}
