import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseService } from './services/course.service';
import { CourseProblem } from '../problems/entities/course-problem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseProblem])],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
