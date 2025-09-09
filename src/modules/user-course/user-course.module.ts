import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCourse } from './entities/user-course.entity';
import { UserCourseService } from './services/user-course.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse])],
  providers: [UserCourseService],
  exports: [UserCourseService],
})
export class UserCourseModule {}
