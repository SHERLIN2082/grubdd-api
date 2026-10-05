import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../model/entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostComment } from '../../model/entities/post-comment.entity';
import { PostLike } from '../../model/entities/post-like.entity';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(PostComment) private readonly comments: Repository<PostComment>,
    @InjectRepository(PostLike) private readonly likes: Repository<PostLike>,
  ) {}

  async list() {
    const posts = await this.posts.find({
      relations: { author: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const result = [];
    for (const post of posts) {
      const likeCount = await this.likes.countBy({ postId: post.id });
      const commentCount = await this.comments.countBy({ postId: post.id });
      result.push({ ...this.serialize(post), likeCount, commentCount });
    }
    return result;
  }

  async listComments(postId: string) {
    const comments = await this.comments.find({
      where: { postId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      author: comment.user.displayName,
    }));
  }

  async addComment(postId: string, userId: string, dto: CreateCommentDto) {
    await this.posts.findOneByOrFail({ id: postId });
    const newComment = this.comments.create({ postId, userId, text: dto.text });
    const comment = await this.comments.save(newComment);
    return { id: comment.id, text: comment.text, createdAt: comment.createdAt };
  }

  async toggleLike(postId: string, userId: string) {
    await this.posts.findOneByOrFail({ id: postId });
    const existing = await this.likes.findOneBy({ postId, userId });
    let liked = true;
    if (existing) {
      await this.likes.remove(existing);
      liked = false;
    } else {
      const like = this.likes.create({ postId, userId });
      await this.likes.save(like);
    }
    const likeCount = await this.likes.countBy({ postId });
    return { liked, likeCount };
  }

  async create(userId: string, dto: CreatePostDto) {
    const post = await this.posts.save(
      this.posts.create({
        authorId: userId,
        restaurantName: dto.restaurantName,
        story: dto.story,
        imageUrl: dto.imageUrl ?? null,
        rating: dto.rating ?? null,
        dishes: dto.dishes ?? [],
        vibes: dto.vibes ?? [],
      }),
    );
    const savedPost = await this.posts.findOneOrFail({
      where: { id: post.id },
      relations: { author: true },
    });
    return this.serialize(savedPost);
  }

  async getOne(id: string) {
    const post = await this.posts.findOneOrFail({
      where: { id },
      relations: { author: true },
    });
    const likeCount = await this.likes.countBy({ postId: post.id });
    const commentCount = await this.comments.countBy({ postId: post.id });
    return { ...this.serialize(post), likeCount, commentCount };
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.posts.findOneByOrFail({ id });
    if (post.authorId !== userId) throw new ForbiddenException('You can only edit your own posts');
    Object.assign(post, dto);
    const saved = await this.posts.save(post);
    return this.serialize(await this.posts.findOneOrFail({
      where: { id: saved.id },
      relations: { author: true },
    }));
  }

  async remove(id: string, userId: string) {
    const post = await this.posts.findOneByOrFail({ id });
    if (post.authorId !== userId) throw new ForbiddenException('You can only delete your own posts');
    await this.posts.remove(post);
    return { deleted: true, id };
  }

  private serialize(post: Post) {
    return {
      id: post.id,
      restaurantName: post.restaurantName,
      story: post.story,
      imageUrl: post.imageUrl,
      rating: post.rating === null ? null : Number(post.rating),
      dishes: post.dishes ?? [],
      vibes: post.vibes ?? [],
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        displayName: post.author.displayName,
        avatar: post.author.avatar,
      },
    };
  }
}
