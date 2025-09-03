import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';

@Module({
  controllers: [TopicsController],
  providers: [TopicsService],
  imports: [TypeOrmModule.forFeature([Topic])],
})
export class TopicsModule {}
