import { Tag } from 'src/modules/problems/tags/entities/tag.entity';
import { DataSource } from 'typeorm';

export async function seedTags(dataSource: DataSource) {
  const tagRepository = dataSource.getRepository(Tag);

  const tags = [
    'Cây khung nhỏ nhất',
    'Tìm đường ngắn nhất',
    'Sắp xếp mảng',
    'Tìm kiếm nhị phân',
    'Dãy con tăng dài nhất',
    'Quay lui',
    'Xử lý chuỗi con',
    'Số nguyên tố',
    'Ngăn xếp và hàng đợi',
    'Hàm đệ quy',
  ];

  for (const tag of tags) {
    const existingTag = await tagRepository.findOne({
      where: { name: tag },
    });
    if (!existingTag) {
      await tagRepository.save({ name: tag });
      console.log(`Tag "${tag}" has been added.`);
    }
  }
}
