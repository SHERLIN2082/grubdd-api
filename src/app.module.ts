import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { PlacesModule } from './modules/places/places.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthMiddleware } from './common/middleware/jwt-auth.middleware';
import { PlacesController } from './modules/places/places.controller';
import { SessionsController } from './modules/sessions/sessions.controller';
import { UsersController } from './modules/users/users.controller';
import { PostsModule } from './modules/posts/posts.module';
import { PostsController } from './modules/posts/posts.controller';
import { CollectionsModule } from './modules/collections/collections.module';
import { CollectionsController } from './modules/collections/collections.controller';
import { GroupsModule } from './modules/groups/groups.module';
import { GroupsController } from './modules/groups/groups.controller';
import { FoodTrailModule } from './modules/food-trail/food-trail.module';
import { FoodTrailController } from './modules/food-trail/food-trail.controller';
import { SavedPlacesModule } from './modules/saved-places/saved-places.module';
import { SavedPlacesController } from './modules/saved-places/saved-places.controller';
import { MediaModule } from './modules/media/media.module';
import { MediaController } from './modules/media/media.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 3306),
        username: config.get('DB_USERNAME', 'root'),
        password: config.get('DB_PASSWORD', 'root'),
        database: config.get('DB_DATABASE', 'grubdd'),
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    AuthModule,
    UsersModule,
    PlacesModule,
    SessionsModule,
    PostsModule,
    CollectionsModule,
    GroupsModule,
    FoodTrailModule,
    SavedPlacesModule,
    MediaModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthMiddleware)
      .forRoutes(
        UsersController,
        SessionsController,
        PlacesController,
        PostsController,
        CollectionsController,
        GroupsController,
        FoodTrailController,
        SavedPlacesController,
        MediaController,
      );
  }
}
