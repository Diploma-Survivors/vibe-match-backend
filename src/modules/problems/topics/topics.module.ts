import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  controllers: [TopicsController],
  providers: [TopicsService],
  imports: [TypeOrmModule.forFeature([Topic])],
  exports: [TopicsService],
})
export class TopicsModule {}
