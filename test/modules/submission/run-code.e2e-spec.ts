import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Judge0Service } from '../../../src/modules/judge0/judge0.service';
import { AppModule } from '../../../src/app.module';
import { SubmissionResultDto } from '../../../src/modules/submission/dto/submission.response.dto';

describe('Submissions E2E', () => {
  let app: INestApplication;
  let judge0Service: Judge0Service;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Spy on the Judge0 service to mock its behavior
    judge0Service = app.get<Judge0Service>(Judge0Service);
  });

  it('/submissions (POST) -> /judge0/callback (POST) -> /submissions/stream (GET)', async () => {
    // 1. Mock the external call to Judge0
    const submissionId = 'e2e-submission-123';
    jest
      .spyOn(judge0Service, 'createSubmissionBatch')
      .mockImplementation(async () => {
        // Return dummy tokens for Judge0
        return {
          submissions: [{ token: 'token-0' }, { token: 'token-1' }],
        };
      });

    // We also need to mock uuidv4 to get a predictable submissionId
    // (This is an advanced technique, for simplicity we assume we get the ID back)

    // 2. Initiate Submission
    const createResponse = await request(app.getHttpServer())
      .post('/submissions')
      .send({
        problemId: 1,
        languageId: 71,
        sourceCode: 'code',
      })
      .expect(201);

    const { submissionId: returnedSubId } = createResponse.body;
    expect(returnedSubId).toBeDefined();

    // 3. Connect to the SSE stream and wait for the final result
    const ssePromise: Promise<SubmissionResultDto> = new Promise(
      (resolve, reject) => {
        const es = new EventSource(
          `${app.getHttpServer().url}/submissions/stream/${returnedSubId}`,
        );
        es.addEventListener('result', (event) => {
          es.close();
          resolve(JSON.parse(event.data));
        });
        es.onerror = (err) => {
          es.close();
          reject(err);
        };
      },
    );

    // 4. Simulate Judge0 callbacks hitting our server
    // We don't await these, we just fire them off
    await request(app.getHttpServer())
      .post(`/judge0/callback/${returnedSubId}/0`)
      .send({ status: { id: 3, description: 'Accepted' }, token: 'token-0' });

    await request(app.getHttpServer())
      .post(`/judge0/callback/${returnedSubId}/1`)
      .send({
        status: { id: 4, description: 'Wrong Answer' },
        token: 'token-1',
      });

    // 5. Await the result from the SSE stream
    const finalResult: SubmissionResultDto = await ssePromise;

    // 6. Assert the final result is what we expect
    expect(finalResult).toBeDefined();
    expect(finalResult.status).toBe('Wrong Answer'); // Assuming this is the aggregation logic
    expect(finalResult.totalTests).toBe(2);
  }, 10000); // Increase timeout for E2E tests
});
