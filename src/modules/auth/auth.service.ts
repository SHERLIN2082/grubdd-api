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
    this.validateDeviceId(deviceId);

    const user = await this.findOrCreateGuest(deviceId);
    const accessToken = await this.createAccessToken(user);
    const isProfileCompleted = Boolean(user.displayName);

    return {
      accessToken,
      user: {
        id: user.id,
        isProfileCompleted,
      },
    };
  }

  private validateDeviceId(deviceId: string): void {
    if (!deviceId || typeof deviceId !== 'string') {
      throw new BadRequestException('deviceId is required');
    }

    if (deviceId.length > 255) {
      throw new BadRequestException('deviceId is too long');
    }
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
    const tokenData = {
      id: user.id,
      deviceId: user.deviceId,
    };
    const jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      'dev-secret',
    );

    return this.jwtService.signAsync(
      tokenData,
      {
        secret: jwtSecret,
        expiresIn: '30d',
      },
    );
  }
}
