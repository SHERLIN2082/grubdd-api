import { Entity, JoinColumn, ManyToOne, Column, Unique } from 'typeorm';
import { Post } from './post.entity';
import { User } from './user.entity';

@Entity('post_likes')
@Unique('UQ_post_like', ['postId', 'userId'])
export class PostLike {
  @Column({ name: 'post_id', type: 'bigint', unsigned: true, primary: true }) postId: string;
  @Column({ name: 'user_id', type: 'bigint', unsigned: true, primary: true }) userId: string;
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id', referencedColumnName: 'id' }) post: Post;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' }) user: User;
}
