import { Topic } from 'src/modules/problems/topics/entities/topic.entity';
import { DataSource } from 'typeorm';

export async function seedTopics(dataSource: DataSource) {
  const topicRepository = dataSource.getRepository(Topic);

  const topics = [
    {
      name: 'Quy hoạch động',
      description:
        'Kỹ thuật chia bài toán thành các bài toán con chồng lấn, lưu trữ kết quả trung gian để tránh tính toán lại, giúp tối ưu thời gian.',
    },
    {
      name: 'Đệ quy',
      description:
        'Phương pháp giải quyết vấn đề bằng cách gọi lại chính hàm đang thực thi, thường kết hợp với chia để trị.',
    },
    {
      name: 'Chia để trị',
      description:
        'Chiến lược chia nhỏ bài toán lớn thành các bài toán con độc lập, giải từng phần rồi kết hợp kết quả.',
    },
    {
      name: 'Thuật toán tham lam',
      description:
        'Phương pháp lựa chọn phương án tốt nhất tại mỗi bước hy vọng dẫn đến nghiệm tối ưu toàn cục.',
    },
    {
      name: 'Cấu trúc dữ liệu',
      description:
        'Các cách tổ chức dữ liệu như mảng, danh sách liên kết, ngăn xếp, hàng đợi, cây, đồ thị để giải quyết vấn đề hiệu quả.',
    },
    {
      name: 'Đồ thị',
      description:
        'Bài toán liên quan đến đỉnh và cạnh, thường áp dụng thuật toán BFS, DFS, Dijkstra, Floyd–Warshall, Kruskal, Prim.',
    },
    {
      name: 'Xử lý chuỗi',
      description:
        'Các kỹ thuật thao tác và phân tích chuỗi ký tự như KMP, Rabin–Karp, Z-algorithm, suffix array.',
    },
    {
      name: 'Số học và lý thuyết số',
      description:
        'Các bài toán về số nguyên, chia hết, ước chung lớn nhất, số nguyên tố, modulo và thuật toán nhanh cho tính toán lớn.',
    },
    {
      name: 'Tìm kiếm và sắp xếp',
      description:
        'Các thuật toán tìm kiếm (nhị phân, tuyến tính) và sắp xếp (quick sort, merge sort, heap sort) để xử lý dữ liệu hiệu quả.',
    },
    {
      name: 'Lập trình hướng đối tượng',
      description:
        'Áp dụng khái niệm lớp, đối tượng, kế thừa, đa hình để tổ chức và quản lý chương trình lớn một cách rõ ràng và dễ bảo trì.',
    },
  ];

  for (const topic of topics) {
    const existingTopic = await topicRepository.find({
      where: { name: topic.name },
    });
    if (!existingTopic) {
      await topicRepository.save(topic);
      console.log(`Topic "${topic.name}" has been added.`);
    }
  }
}
