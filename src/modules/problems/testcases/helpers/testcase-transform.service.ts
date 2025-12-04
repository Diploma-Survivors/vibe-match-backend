// Built-in
import { createReadStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';

// NestJS
import { Injectable, Logger } from '@nestjs/common';

// Third-party
import { streamArray } from 'stream-json/streamers/StreamArray';
import { TestcaseFormat } from '../constants/testcases.constant';

/**
 * Dedicated Transform stream class for converting JSON testcases to NDJSON format
 */
class TestcaseNDJSONTransform extends Transform {
  private testcaseId = 0;
  private processedCount = 0;

  constructor(private readonly logger: Logger) {
    super({
      objectMode: true, // Input: objects from stream-json
      writableObjectMode: true,
      readableObjectMode: false, // Output: strings (NDJSON lines)
    });
  }

  _transform(
    data: { key: number; value: TestcaseFormat },
    _encoding: string,
    callback: (error?: Error | null, data?: any) => void,
  ): void {
    try {
      const testcase = data.value;
      this.testcaseId++;

      // Build NDJSON object
      const ndjsonObject: any = {
        id: this.testcaseId,
        input: testcase.input,
        output: testcase.output,
      };

      // Convert to NDJSON line (JSON + newline)
      const ndjsonLine = JSON.stringify(ndjsonObject) + '\n';

      this.processedCount++;
      if (this.processedCount % 100 === 0) {
        this.logger.debug(`Transformed ${this.processedCount} testcases...`);
      }

      callback(null, ndjsonLine);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Transform error at testcase ${this.testcaseId}: ${message}`,
      );
      callback(error);
    }
  }

  _flush(callback: (error?: Error | null) => void): void {
    this.logger.log(`Transform completed: ${this.processedCount} testcases`);
    callback();
  }
}

@Injectable()
export class TestcaseTransformService {
  private readonly logger = new Logger(TestcaseTransformService.name);

  /**
   * @description Create a transform stream that reads a JSON testcase file
   * and outputs NDJSON formatted testcases
   * @param filePath Path to the JSON testcase file
   * @returns Readable stream of NDJSON testcases
   */
  createTransformStream(filePath: string): Readable {
    this.logger.log(`Creating transform stream for: ${filePath}`);

    const fileStream = createReadStream(filePath, { encoding: 'utf8' });
    const jsonParser = streamArray();

    const ndjsonTransform = new TestcaseNDJSONTransform(this.logger);

    // Pipeline: File → Parse JSON Array → Transform to NDJSON
    return fileStream.pipe(jsonParser).pipe(ndjsonTransform);
  }
}
