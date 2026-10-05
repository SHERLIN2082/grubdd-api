import { Body, Controller, Delete, Get, Param, Patch, Post as HttpPost, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../../common/interfaces/auth-request.interface';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
@ApiTags('Posts')
@ApiBearerAuth()
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list() {
    return this.posts.list();
  }

  @HttpPost()
  create(@Req() request: AuthRequest, @Body() dto: CreatePostDto) {
    return this.posts.create(request.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() request: AuthRequest, @Body() dto: UpdatePostDto) {
    return this.posts.update(id, request.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.posts.remove(id, request.user.id);
  }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.posts.getOne(id); }

  @Get(':id/comments')
  comments(@Param('id') id: string) { return this.posts.listComments(id); }

  @HttpPost(':id/comments')
  addComment(@Param('id') id: string, @Req() request: AuthRequest, @Body() dto: CreateCommentDto) {
    return this.posts.addComment(id, request.user.id, dto);
  }

  @HttpPost(':id/like')
  like(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.posts.toggleLike(id, request.user.id);
  }
}
