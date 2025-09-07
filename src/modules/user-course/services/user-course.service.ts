import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCourse } from '../entities/user-course.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { RoleEnum } from '../../user/enums/role.enum';

@Injectable()
export class UserCourseService {
  private readonly logger = new Logger(UserCourseService.name);

  constructor(
    @InjectRepository(UserCourse)
    private readonly userCourseRepository: Repository<UserCourse>,
  ) {}

  public async enrollUserInCourse(
    user: User,
    course: Course,
    rolesInCourse: RoleEnum[],
  ): Promise<UserCourse> {
    let userCourse = await this.userCourseRepository.findOne({
      where: {
        userId: user.id,
        courseId: course.id,
      },
    });

    if (!userCourse) {
      userCourse = this.userCourseRepository.create({
        userId: user.id,
        courseId: course.id,
        rolesInCourse: rolesInCourse,
      });
      await this.userCourseRepository.save(userCourse);
      this.logger.log(
        `Enrolled user ${user.id} in course ${course.id} with roles: ${rolesInCourse.join(', ')}`,
      );
    } else {
      if (
        JSON.stringify(userCourse.rolesInCourse) !==
        JSON.stringify(rolesInCourse)
      ) {
        userCourse.rolesInCourse = rolesInCourse;
        await this.userCourseRepository.save(userCourse);
        this.logger.log(
          `Updated roles for user ${user.id} in course ${course.id} to: ${rolesInCourse.join(', ')}`,
        );
      }
    }

    return userCourse;
  }
}
