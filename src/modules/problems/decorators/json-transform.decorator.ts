import { BadRequestException, Logger } from '@nestjs/common';
import { Transform } from 'class-transformer';

export function JsonArrayTransform(fieldName: string): PropertyDecorator {
  return Transform(({ value }) => {
    if (!value) {
      return;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (!Array.isArray(parsed)) {
          throw new BadRequestException(
            `${fieldName} must be a JSON array string`,
          );
        }
        return parsed as string[];
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        Logger.warn(`Failed to parse ${fieldName}: ${err}`);
        throw new BadRequestException(`Invalid JSON format for ${fieldName}`);
      }
    }

    if (Array.isArray(value)) {
      return value as string[];
    }

    throw new BadRequestException(`${fieldName} must be a JSON array string`);
  });
}
