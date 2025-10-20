import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { ProblemTopic } from '../entities/problem-topic.entity';

@Module({
  controllers: [TopicsController],
  providers: [TopicsService],
  imports: [TypeOrmModule.forFeature([Topic, ProblemTopic])],
  exports: [TopicsService],
})
export class TopicsModule {}
