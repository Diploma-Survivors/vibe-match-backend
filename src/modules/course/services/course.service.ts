import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IdTokenPayloadDto } from 'src/modules/lti/dto/id-token-payload.dto';
import { LtiDeployment } from 'src/modules/lti/entities/lti-deployment.entity';
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
    ltiDeployment: LtiDeployment,
  ): Promise<Course> {
    const ltiContextClaim = claims.context;
    const ltiCourseId = ltiContextClaim.id;

    let course = await this.courseRepository.findOne({
      where: {
        ltiCourseId: ltiCourseId,
        tenantId: ltiDeployment.tenantId,
      },
    });

    const title = ltiContextClaim.title || null;

    if (!course) {
      course = this.courseRepository.create({
        ltiCourseId: ltiCourseId,
        ltiDeployment,
        title: title,
      });
      await this.courseRepository.save(course);
      this.logger.log(
        `Created new LTI course: ${course.title || course.ltiCourseId} on platform ${ltiDeployment.issuerUrl}`,
      );
    } else {
      if (course.title !== title) course.title = title;
      if (course.ltiDeploymentId !== ltiDeployment.id)
        course.ltiDeploymentId = ltiDeployment.id;
      await this.courseRepository.save(course);
      this.logger.log(
        `Updated LTI course: ${course.title || course.ltiCourseId} on platform ${ltiDeployment.issuerUrl}`,
      );
    }

    return course;
  }
}
