import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IdTokenPayloadDto } from 'src/modules/lti/dto/id-token-payload.dto';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  public async findOrCreateByLtiContextClaims(
    claims: IdTokenPayloadDto,
  ): Promise<Course> {
    const ltiContextClaim = claims.context;
    const ltiPlatformId = claims.iss;
    const ltiCourseId = ltiContextClaim.id;

    let course = await this.courseRepository.findOne({
      where: {
        ltiCourseId: ltiCourseId,
        ltiPlatformId: ltiPlatformId,
      },
    });

    const title = ltiContextClaim.title || null;

    if (!course) {
      course = this.courseRepository.create({
        ltiCourseId: ltiCourseId,
        ltiPlatformId: ltiPlatformId,
        title: title,
      });
      await this.courseRepository.save(course);
      this.logger.log(
        `Created new LTI course: ${course.title || course.ltiCourseId} on platform ${course.ltiPlatformId}`,
      );
    } else {
      if (course.title !== title) course.title = title;
      await this.courseRepository.save(course);
      this.logger.log(
        `Updated LTI course: ${course.title || course.ltiCourseId} on platform ${course.ltiPlatformId}`,
      );
    }

    return course;
  }
}
