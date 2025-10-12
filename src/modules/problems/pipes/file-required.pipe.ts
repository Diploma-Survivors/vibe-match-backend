import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class FileRequiredPipe implements PipeTransform {
  transform(value: Express.Multer.File) {
    if (!value) {
      throw new BadRequestException('File is required');
    }

    return value;
  }
}
