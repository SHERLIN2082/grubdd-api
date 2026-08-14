import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../model/entities/user.entity';
import { JwtAuthMiddleware } from '../../common/middleware/jwt-auth.middleware';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthMiddleware],
  exports: [JwtModule, JwtAuthMiddleware],
})
export class AuthModule {}
