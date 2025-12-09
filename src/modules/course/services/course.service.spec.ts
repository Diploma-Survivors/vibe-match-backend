import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IdTokenPayloadDto } from 'src/modules/lti/dto/id-token-payload.dto';
import { LtiDeployment } from 'src/modules/lti/entities/lti-deployment.entity';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CourseService } from './course.service';

describe('CourseService', () => {
  let service: CourseService;
  let courseRepository: Repository<Course>;

  const mockCourseRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        {
          provide: getRepositoryToken(Course),
          useValue: mockCourseRepository,
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    courseRepository = module.get<Repository<Course>>(
      getRepositoryToken(Course),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateByLtiContextClaims', () => {
    const claims = {
      iss: 'platformId',
      context: {
        id: 'courseId',
        title: 'courseTitle',
      },
    } as IdTokenPayloadDto;

    const ltiDeployment = {
      id: 1,
      name: 'Test Deployment',
      issuerUrl: 'https://lms.example.com',
      clientId: 'client123',
      deploymentId: 'deployment123',
      authenticationUrl: 'https://lms.example.com/auth',
      jwksUrl: 'https://lms.example.com/jwks',
      tokenUrl: 'https://lms.example.com/token',
      isActive: true,
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LtiDeployment;

    it('should create a new course if it does not exist', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);
      const newCourse = { id: 1, ...claims };
      mockCourseRepository.create.mockReturnValue(newCourse);
      mockCourseRepository.save.mockResolvedValue(newCourse);

      const result = await service.findOrCreateByLtiContextClaims(
        claims,
        ltiDeployment,
      );

      expect(courseRepository.findOne).toHaveBeenCalledWith({
        where: { ltiCourseId: 'courseId', tenantId: ltiDeployment.tenantId },
      });
      expect(courseRepository.create).toHaveBeenCalledWith({
        ltiCourseId: 'courseId',
        ltiDeployment,
        title: 'courseTitle',
      });
      expect(courseRepository.save).toHaveBeenCalledWith(newCourse);
      expect(result).toEqual(newCourse);
    });

    it('should update the course title if it exists and has a different title', async () => {
      const existingCourse = {
        id: 1,
        ltiCourseId: 'courseId',
        ltiPlatformId: 'platformId',
        title: 'oldTitle',
      };
      mockCourseRepository.findOne.mockResolvedValue(existingCourse);
      mockCourseRepository.save.mockResolvedValue({
        ...existingCourse,
        title: 'courseTitle',
      });

      const result = await service.findOrCreateByLtiContextClaims(
        claims,
        ltiDeployment,
      );

      expect(courseRepository.findOne).toHaveBeenCalledWith({
        where: { ltiCourseId: 'courseId', tenantId: ltiDeployment.tenantId },
      });
      expect(courseRepository.create).not.toHaveBeenCalled();
      expect(courseRepository.save).toHaveBeenCalledWith({
        ...existingCourse,
        title: 'courseTitle',
      });
      expect(result.title).toBe('courseTitle');
    });

    it('should return the course if it exists and the title is the same', async () => {
      const existingCourse = {
        id: 1,
        ltiCourseId: 'courseId',
        ltiPlatformId: 'platformId',
        title: 'courseTitle',
      };
      mockCourseRepository.findOne.mockResolvedValue(existingCourse);

      const result = await service.findOrCreateByLtiContextClaims(
        claims,
        ltiDeployment,
      );

      expect(courseRepository.findOne).toHaveBeenCalledWith({
        where: { ltiCourseId: 'courseId', tenantId: ltiDeployment.tenantId },
      });
      expect(courseRepository.create).not.toHaveBeenCalled();
      expect(courseRepository.save).toHaveBeenCalledWith(existingCourse);
      expect(result).toEqual(existingCourse);
    });
  });
});
