import { Problem } from 'src/modules/problems/entities/problem.entity';
import { DifficultyLevel } from 'src/modules/problems/enums/difficulty-level.enum';
import { ProblemType } from 'src/modules/problems/enums/problem-type.enum';
import { Tag } from 'src/modules/problems/tags/entities/tag.entity';
import { Topic } from 'src/modules/problems/topics/entities/topic.entity';
import { UserCourse } from 'src/modules/user-course/entities/user-course.entity';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { DataSource } from 'typeorm';

export async function seedProblems(dataSource: DataSource) {
  const tagRepository = dataSource.getRepository(Tag);
  const topicRepository = dataSource.getRepository(Topic);
  const userCourseRepository = dataSource.getRepository(UserCourse);
  const problemRepository = dataSource.getRepository(Problem);

  const userCourse = await userCourseRepository.findOne({
    where: { rolesInCourse: RoleEnum.INSTRUCTOR },
    relations: ['course'],
  });
  if (!userCourse) {
    console.error(
      'No user with INSTRUCTOR role found. Please ensure at least one instructor exists before seeding problems. (Through LMS)',
    );
    return;
  }

  const tags = await tagRepository.find();
  const topics = await topicRepository.find();

  const problems = [
    {
      title: 'Số chính phương',
      description: 'Kiểm tra xem một số có phải là số chính phương hay không.',
      inputDescription: 'Một số nguyên dương n.',
      outputDescription:
        'In ra "YES" nếu n là số chính phương, ngược lại in "NO".',
      maxScore: 100,
      timeLimitMs: 1000,
      memoryLimitKb: 65536,
      difficulty: DifficultyLevel.EASY,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.course.id } }],
      author: { id: userCourse.userId },
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
      testcase: {
        fileUrl: 'https://example.com/testcases/square_number.zip',
      },
      testcaseSamples: [
        { input: '16', output: 'YES' },
        { input: '20', output: 'NO' },
      ],
    },
    {
      title: 'Tổng dãy số',
      description: 'Tính tổng các số từ 1 đến n.',
      inputDescription: 'Một số nguyên dương n.',
      outputDescription: 'In ra tổng các số từ 1 đến n.',
      maxScore: 100,
      timeLimitMs: 1000,
      memoryLimitKb: 65536,
      difficulty: DifficultyLevel.MEDIUM,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.course.id } }],
      author: { id: userCourse.userId },
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
      testcase: {
        fileUrl: 'https://example.com/testcases/sum_series.zip',
      },
      testcaseSamples: [
        { input: '5', output: '15' },
        { input: '10', output: '55' },
      ],
    },
    {
      title: 'Số nguyên tố',
      description: 'Kiểm tra xem một số có phải là số nguyên tố hay không.',
      inputDescription: 'Một số nguyên dương n.',
      outputDescription:
        'In ra "YES" nếu n là số nguyên tố, ngược lại in "NO".',
      maxScore: 100,
      timeLimitMs: 1000,
      memoryLimitKb: 65536,
      difficulty: DifficultyLevel.HARD,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.course.id } }],
      author: { id: userCourse.userId },
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
      testcase: {
        fileUrl: 'https://example.com/testcases/prime_number.zip',
      },
      testcaseSamples: [
        { input: '7', output: 'YES' },
        { input: '10', output: 'NO' },
      ],
    },
    {
      title: 'Dãy Fibonacci',
      description: 'Tính số Fibonacci thứ n.',
      inputDescription: 'Một số nguyên dương n.',
      outputDescription: 'In ra số Fibonacci thứ n.',
      maxScore: 100,
      timeLimitMs: 1000,
      memoryLimitKb: 65536,
      difficulty: DifficultyLevel.EASY,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.course.id } }],
      author: { id: userCourse.userId },
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
      testcase: {
        fileUrl: 'https://example.com/testcases/fibonacci.zip',
      },
      testcaseSamples: [
        { input: '5', output: '5' },
        { input: '10', output: '55' },
      ],
    },
    {
      title: 'Sắp xếp mảng',
      description: 'Sắp xếp một mảng số nguyên theo thứ tự tăng dần.',
      inputDescription: 'Một dòng chứa n số nguyên.',
      outputDescription: 'In ra mảng đã được sắp xếp.',
      maxScore: 100,
      timeLimitMs: 1000,
      memoryLimitKb: 65536,
      difficulty: DifficultyLevel.MEDIUM,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.course.id } }],
      author: { id: userCourse.userId },
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
      testcase: {
        fileUrl: 'https://example.com/testcases/sort_array.zip',
      },
      testcaseSamples: [
        { input: '3 1 2', output: '1 2 3' },
        { input: '5 4 3 2 1', output: '1 2 3 4 5' },
      ],
    },
    {
      title: 'Tìm kiếm nhị phân',

      description:
        'Tìm vị trí của một số trong mảng đã sắp xếp sử dụng tìm kiếm nhị phân.',
      inputDescription:
        'Dòng đầu tiên chứa n và x. Dòng thứ hai chứa n số nguyên đã sắp xếp.',
      outputDescription:
        'In ra vị trí của x trong mảng, hoặc -1 nếu không tìm thấy.',
      maxScore: 100,
      timeLimitMs: 1000,
      memoryLimitKb: 65536,
      difficulty: DifficultyLevel.HARD,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.course.id } }],
      author: { id: userCourse.userId },
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
      testcase: {
        fileUrl: 'https://example.com/testcases/binary_search.zip',
      },
      testcaseSamples: [
        { input: '5 3\n1 2 3 4 5', output: '2' },
        { input: '5 6\n1 2 3 4 5', output: '-1' },
      ],
    },
  ];

  for (const problemData of problems) {
    const problem = problemRepository.create(problemData);
    await problemRepository.save(problem);
  }
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const selected = new Set<T>();
  while (selected.size < count) {
    selected.add(array[Math.floor(Math.random() * array.length)]);
  }
  return Array.from(selected);
}
