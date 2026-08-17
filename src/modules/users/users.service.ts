import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from '../../model/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findMe(id: string) {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    if (!dto || !dto.displayName || typeof dto.displayName !== 'string') {
      throw new BadRequestException('displayName is required');
    }

    if (dto.displayName.length > 100) {
      throw new BadRequestException('displayName must be 100 characters or less');
    }

    const cleanName = dto.displayName.trim();
    const duplicateUser = await this.userRepository.findOneBy({
      displayName: cleanName,
    });

    if (duplicateUser && duplicateUser.id !== id) {
      throw new BadRequestException('This display name is already taken');
    }

    if (dto.avatar !== undefined) {
      if (typeof dto.avatar !== 'string' || dto.avatar.length === 0) {
        throw new BadRequestException('avatar cannot be empty');
      }

      if (dto.avatar.length > 20) {
        throw new BadRequestException('avatar must be 20 characters or less');
      }
    }

    const user = await this.findMe(id);
    user.displayName = cleanName;

    if (dto.avatar !== undefined) {
      user.avatar = dto.avatar;
    }

    return this.userRepository.save(user);
  }
}
