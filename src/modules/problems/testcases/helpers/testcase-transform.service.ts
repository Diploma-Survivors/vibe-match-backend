// Built-in
import { createReadStream } from 'node:fs';
import { PassThrough, Readable, Transform } from 'node:stream';

// NestJS
import { Injectable, Logger } from '@nestjs/common';

// Third-party
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import stripBomStream from 'strip-bom-stream';

// Relative imports
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
      callback(error as unknown as Error);
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

    const spy = new PassThrough();

    // Chỉ xem chunk đầu tiên
    spy.once('data', (chunk: Buffer) => {
      // Convert vài ký tự đầu sang String để xem
      const startString = chunk.toString('utf8').substring(0, 50);

      // In ra dạng HEX để bắt tận tay mấy ký tự ẩn (BOM, null byte...)
      const startHex = chunk.subarray(0, 10).toString('hex');

      this.logger.warn(`[SPY] First bytes (Hex): ${startHex}`);
      this.logger.warn(`[SPY] First chars (Text): '${startString}'`);
    });

    // Pipeline: File → Strip BOM -> Parse JSON Array -> Stream Array → Transform to NDJSON
    const pipeline = chain([
      createReadStream(filePath),
      stripBomStream(),
      parser(),
      streamArray(),
      new TestcaseNDJSONTransform(this.logger),
    ]);

    return pipeline;
  }
}
