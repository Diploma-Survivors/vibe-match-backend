import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('submission')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('/run')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  run(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.submissionService.runCode(dto, file);
  }
}
