import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseService } from './services/course.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course])],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
