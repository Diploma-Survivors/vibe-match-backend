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
    const rolesInCourseSorted = rolesInCourse.toSorted((a, b) =>
      a.localeCompare(b),
    );

    if (!userCourse) {
      userCourse = this.userCourseRepository.create({
        userId: user.id,
        courseId: course.id,
        rolesInCourse: rolesInCourseSorted,
      });
      await this.userCourseRepository.save(userCourse);
      this.logger.log(
        `Enrolled user ${user.id} in course ${course.id} with roles: ${rolesInCourseSorted.join(', ')}`,
      );
    } else if (
      JSON.stringify(userCourse.rolesInCourse) !==
      JSON.stringify(rolesInCourseSorted)
    ) {
      userCourse.rolesInCourse = rolesInCourseSorted;
      await this.userCourseRepository.save(userCourse);
      this.logger.log(
        `Updated roles for user ${user.id} in course ${course.id} to: ${rolesInCourseSorted.join(', ')}`,
      );
    }

    return userCourse;
  }
}
