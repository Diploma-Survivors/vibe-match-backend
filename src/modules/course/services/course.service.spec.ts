import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IdTokenPayloadDto } from 'src/modules/lti/dto/id-token-payload.dto';
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

    it('should create a new course if it does not exist', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);
      const newCourse = { id: 1, ...claims };
      mockCourseRepository.create.mockReturnValue(newCourse);
      mockCourseRepository.save.mockResolvedValue(newCourse);

      const result = await service.findOrCreateByLtiContextClaims(claims);

      expect(courseRepository.findOne).toHaveBeenCalledWith({
        where: { ltiCourseId: 'courseId', ltiPlatformId: 'platformId' },
      });
      expect(courseRepository.create).toHaveBeenCalledWith({
        ltiCourseId: 'courseId',
        ltiPlatformId: 'platformId',
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

      const result = await service.findOrCreateByLtiContextClaims(claims);

      expect(courseRepository.findOne).toHaveBeenCalledWith({
        where: { ltiCourseId: 'courseId', ltiPlatformId: 'platformId' },
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

      const result = await service.findOrCreateByLtiContextClaims(claims);

      expect(courseRepository.findOne).toHaveBeenCalledWith({
        where: { ltiCourseId: 'courseId', ltiPlatformId: 'platformId' },
      });
      expect(courseRepository.create).not.toHaveBeenCalled();
      expect(courseRepository.save).toHaveBeenCalledWith(existingCourse);
      expect(result).toEqual(existingCourse);
    });
  });
});
