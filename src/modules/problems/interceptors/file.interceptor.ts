// NestJS
import { BadRequestException } from '@nestjs/common';
import { FileInterceptor as FileIn } from '@nestjs/platform-express';

// Relative imports
import {
  TESTCASE_FILE_FIELD_NAME,
  TESTCASE_FILE_MIME_TYPE,
  TESTCASE_MAX_FILE_SIZE,
} from '../testcases/constants/testcases.constant';

export function FileInterceptor(
  fieldName: string = TESTCASE_FILE_FIELD_NAME,
  maxFileSize: number = TESTCASE_MAX_FILE_SIZE,
  mimeType: string = TESTCASE_FILE_MIME_TYPE,
) {
  return FileIn(fieldName, {
    limits: {
      fileSize: maxFileSize,
    },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== mimeType) {
        return cb(
          new BadRequestException(
            `Invalid file type. Expected ${mimeType} but received ${file.mimetype}`,
          ),
          false,
        );
      }

      return cb(null, true);
    },
  });
}
