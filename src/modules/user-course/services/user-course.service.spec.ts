import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { RoleEnum } from '../../user/enums/role.enum';
import { UserCourse } from '../entities/user-course.entity';
import { UserCourseService } from './user-course.service';

describe('UserCourseService', () => {
  let service: UserCourseService;

  const mockUserCourseRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCourseService,
        {
          provide: getRepositoryToken(UserCourse),
          useValue: mockUserCourseRepository,
        },
      ],
    }).compile();

    service = module.get<UserCourseService>(UserCourseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enrollUserInCourse', () => {
    const user = { id: 1 } as User;
    const course = { id: 1 } as Course;
    const roles = [RoleEnum.STUDENT];

    it('should enroll a user if not already enrolled', async () => {
      mockUserCourseRepository.findOne.mockResolvedValue(null);
      const newUserCourse = { userId: 1, courseId: 1, rolesInCourse: roles };
      mockUserCourseRepository.create.mockReturnValue(newUserCourse);
      mockUserCourseRepository.save.mockResolvedValue(newUserCourse);

      const result = await service.enrollUserInCourse(user, course, roles);

      expect(mockUserCourseRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1, courseId: 1 },
      });
      expect(mockUserCourseRepository.create).toHaveBeenCalledWith({
        userId: 1,
        courseId: 1,
        rolesInCourse: roles,
      });
      expect(mockUserCourseRepository.save).toHaveBeenCalledWith(newUserCourse);
      expect(result).toEqual(newUserCourse);
    });

    it('should update roles if user is already enrolled with different roles', async () => {
      const existingUserCourse = {
        userId: 1,
        courseId: 1,
        rolesInCourse: [RoleEnum.INSTRUCTOR],
      };
      mockUserCourseRepository.findOne.mockResolvedValue(existingUserCourse);

      await service.enrollUserInCourse(user, course, roles);

      expect(mockUserCourseRepository.save).toHaveBeenCalledWith({
        ...existingUserCourse,
        rolesInCourse: roles,
      });
    });

    it('should not update if user is already enrolled with same roles', async () => {
      const existingUserCourse = {
        userId: 1,
        courseId: 1,
        rolesInCourse: [RoleEnum.STUDENT],
      };
      mockUserCourseRepository.findOne.mockResolvedValue(existingUserCourse);

      await service.enrollUserInCourse(user, course, roles);

      expect(mockUserCourseRepository.save).not.toHaveBeenCalled();
    });
  });
});
