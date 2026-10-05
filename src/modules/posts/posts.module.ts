import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../model/entities/post.entity';
import { PostComment } from '../../model/entities/post-comment.entity';
import { PostLike } from '../../model/entities/post-like.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostComment, PostLike])],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
