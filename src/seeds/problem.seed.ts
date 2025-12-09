import { Problem } from 'src/modules/problems/entities/problem.entity';
import { DifficultyLevel } from 'src/modules/problems/enums/difficulty-level.enum';
import { ProblemType } from 'src/modules/problems/enums/problem-type.enum';
import { Tag } from 'src/modules/problems/tags/entities/tag.entity';
import { Testcase } from 'src/modules/problems/testcases/entities/testcase.entity';
import { Topic } from 'src/modules/problems/topics/entities/topic.entity';
import { UserCourse } from 'src/modules/user-course/entities/user-course.entity';
import { RoleEnum } from 'src/modules/user/enums/role.enum';
import { DataSource } from 'typeorm';

export async function seedProblems(dataSource: DataSource) {
  const tagRepository = dataSource.getRepository(Tag);
  const topicRepository = dataSource.getRepository(Topic);
  const userCourseRepository = dataSource.getRepository(UserCourse);
  const problemRepository = dataSource.getRepository(Problem);
  const testcaseRepository = dataSource.getRepository(Testcase);

  const userCourse = await userCourseRepository.findOne({
    where: { rolesInCourse: RoleEnum.INSTRUCTOR },
  });
  if (!userCourse) {
    console.error(
      '\n\n!!!!!!!!!No user with INSTRUCTOR role found. Please ensure at least one instructor exists before seeding problems. (Through LMS)!!!!!!!!\n\n',
    );
    return;
  }

  const countProblems = await problemRepository.count();
  if (countProblems > 0) {
    console.log('Problems already seeded. Skipping problem seeding.');
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
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
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
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
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
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
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
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
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
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
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
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: '5 3\n1 2 3 4 5', output: '2' },
        { input: '5 6\n1 2 3 4 5', output: '-1' },
      ],
    },
    {
      title: 'Two Sum 2',
      description:
        'Cho một mảng số nguyên nums và một số nguyên target, hãy trả về chỉ số của hai phần tử sao cho tổng của chúng bằng target. Mỗi đầu vào đảm bảo chỉ có một nghiệm duy nhất.',
      inputDescription: 'nums = [2,7,11,15], target = 9',
      outputDescription: '[0,1]',
      maxScore: 100,
      timeLimitMs: 2000,
      memoryLimitKb: 10000,
      difficulty: DifficultyLevel.EASY,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 3).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 3).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: '2 7 11 15\n9', output: '0 1' },
        { input: '1 3 4 6\n7', output: '1 2' },
      ],
    },
    {
      title: 'Dãy con tăng dài nhất',
      description:
        'Cho một mảng số nguyên, hãy tìm độ dài của dãy con tăng dài nhất trong mảng.',
      inputDescription: 'nums = [10,9,2,5,3,7,101,18]',
      outputDescription: '4',
      maxScore: 150,
      timeLimitMs: 3000,
      memoryLimitKb: 12000,
      difficulty: DifficultyLevel.MEDIUM,
      type: ProblemType.CONTEST,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 2).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 2).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: '10 9 2 5 3 7 101 18', output: '4' },
        { input: '0 1 0 3 2 3', output: '4' },
      ],
    },
    {
      title: 'Tìm kiếm nhị phân',
      description:
        'Viết hàm thực hiện tìm kiếm nhị phân trên một mảng đã sắp xếp để tìm phần tử x.',
      inputDescription: 'nums = [-1,0,3,5,9,12], target = 9',
      outputDescription: '4',
      maxScore: 100,
      timeLimitMs: 1000,
      memoryLimitKb: 8000,
      difficulty: DifficultyLevel.HARD,
      type: ProblemType.CONTEST,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 2).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 2).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: '-1 0 3 5 9 12\n9', output: '4' },
        { input: '-1 0 3 5 9 12\n2', output: '-1' },
      ],
    },
    {
      title: 'Cây khung nhỏ nhất',
      description:
        'Cho một đồ thị vô hướng có trọng số, hãy tìm tổng trọng số của cây khung nhỏ nhất.',
      inputDescription: 'n = 4, edges = [[0,1,1],[1,2,2],[0,2,2],[2,3,1]]',
      outputDescription: '4',
      maxScore: 200,
      timeLimitMs: 4000,
      memoryLimitKb: 16000,
      difficulty: DifficultyLevel.MEDIUM,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 2).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 2).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: '4\n0 1 1\n1 2 2\n0 2 2\n2 3 1', output: '4' },
        { input: '3\n0 1 5\n1 2 3\n0 2 4', output: '7' },
      ],
    },
    {
      title: 'Tìm đường ngắn nhất',
      description:
        'Cho đồ thị có trọng số dương, tìm đường đi ngắn nhất từ đỉnh nguồn tới tất cả các đỉnh khác.',
      inputDescription:
        'n = 5, edges = [[0,1,10],[0,2,3],[1,2,1],[2,1,4],[2,3,2],[3,4,7],[4,0,9]]',
      outputDescription: '[0,7,3,5,12]',
      maxScore: 200,
      timeLimitMs: 5000,
      memoryLimitKb: 20000,
      difficulty: DifficultyLevel.HARD,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 2).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 2).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        {
          input: '5\n0 1 10\n0 2 3\n1 2 1\n2 1 4\n2 3 2\n3 4 7\n4 0 9',
          output: '0 7 3 5 12',
        },
        { input: '3\n0 1 1\n1 2 2\n0 2 4', output: '0 1 3' },
      ],
    },
    {
      title: 'Quay lui - N quân hậu',
      description:
        'Đặt N quân hậu trên bàn cờ NxN sao cho không quân nào ăn nhau.',
      inputDescription: 'N = 4',
      outputDescription: '2',
      maxScore: 250,
      timeLimitMs: 5000,
      memoryLimitKb: 20000,
      difficulty: DifficultyLevel.HARD,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 2).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 2).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: '4', output: '2' },
        { input: '1', output: '1' },
      ],
    },
    {
      title: 'Xử lý chuỗi con',
      description: 'Tìm chuỗi con dài nhất không lặp lại trong một chuỗi.',
      inputDescription: 's = "abcabcbb"',
      outputDescription: '3',
      maxScore: 150,
      timeLimitMs: 2000,
      memoryLimitKb: 12000,
      difficulty: DifficultyLevel.EASY,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 2).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 2).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: 'abcabcbb', output: '3' },
        { input: 'bbbbb', output: '1' },
      ],
    },
    {
      title: 'Số nguyên tố',
      description: 'Đếm số lượng số nguyên tố nhỏ hơn n.',
      inputDescription: 'n = 10',
      outputDescription: '4',
      maxScore: 120,
      timeLimitMs: 1500,
      memoryLimitKb: 10000,
      difficulty: DifficultyLevel.EASY,
      type: ProblemType.STANDALONE,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 2).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 2).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: '10', output: '4' },
        { input: '0', output: '0' },
      ],
    },
    {
      title: 'Ngăn xếp và hàng đợi',
      description: 'Cài đặt cấu trúc dữ liệu ngăn xếp và hàng đợi cơ bản.',
      inputDescription: 'push 1, push 2, pop',
      outputDescription: '1',
      maxScore: 100,
      timeLimitMs: 1000,
      memoryLimitKb: 8000,
      difficulty: DifficultyLevel.EASY,
      type: ProblemType.CONTEST,
      courseProblems: [{ course: { id: userCourse.courseId } }],
      authorId: userCourse.userId,
      problemTags: getRandomElements<Tag>(tags, 2).map((tag) => ({ tag })),
      problemTopics: getRandomElements<Topic>(topics, 2).map((topic) => ({
        topic,
      })),
      testcaseSamples: [
        { input: 'push 1\npush 2\npop', output: '2' },
        { input: 'push 5\npop', output: '5' },
      ],
    },
  ];

  for (const problemData of problems) {
    const problem = problemRepository.create(problemData);
    const problemSaved = await problemRepository.save(problem);

    const testcase = {
      fileUrl: `https://example.com/testcases/${problem.title}`,
      problemId: problemSaved.id,
    };
    const newTestcase = testcaseRepository.create(testcase);
    await testcaseRepository.save(newTestcase);
  }
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const selected = new Set<T>();
  while (selected.size < count) {
    selected.add(array[Math.floor(Math.random() * array.length)]);
  }
  return Array.from(selected);
}
