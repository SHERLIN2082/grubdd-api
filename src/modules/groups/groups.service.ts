import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Group } from '../../model/entities/group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { User } from '../../model/entities/user.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  list(userId: string) {
    return this.groups.find({ order: { createdAt: 'DESC' } }).then((groups) =>
      groups.filter((group) => group.ownerId === userId || (group.memberIds ?? []).includes(userId)),
    );
  }

  create(userId: string, dto: CreateGroupDto) {
    return this.groups.save(this.groups.create({
      ownerId: userId,
      name: dto.name,
      description: dto.description ?? null,
      memberIds: [userId],
    }));
  }

  async join(userId: string, groupId: string) {
    const group = await this.groups.findOneByOrFail({ id: groupId });
    const members = group.memberIds ?? [];
    if (!members.includes(userId)) {
      group.memberIds = [...members, userId];
      await this.groups.save(group);
    }
    const users = group.memberIds?.length
      ? await this.users.findBy({ id: In(group.memberIds) })
      : [];
    return {
      ...group,
      members: users.map((user) => ({ id: user.id, displayName: user.displayName, avatar: user.avatar })),
    };
  }

  async getOne(groupId: string, userId: string) {
    const group = await this.groups.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId && !(group.memberIds ?? []).includes(userId)) {
      throw new ForbiddenException('You are not a member of this group');
    }
    return group;
  }
}
