import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios, { AxiosError } from 'axios';
import * as jose from 'jose';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Submission } from '../../submission/entities/submission.entity';
import { GradingStrategyService } from '../../submission/strategies/grading-strategy.service';
import { KeysService } from '../keys.service';
import { SendScoreDto } from './dto/send-score.dto';
import { AgsActivityProgress } from './enums/ags-activity-progress.enum';
import { AgsGradingProgress } from './enums/ags-grading-progress.enum';
import { AgsScope } from './enums/ags-scope.enum';
import {
  AgsAccessTokenResponse,
  AgsTokenCache,
} from './interfaces/ags-token.interface';
import { ContestParticipation } from '../../contests/entities/contest-participations.entity';
import { ContestProblemResult } from '../../contests/entities/contest-problem-result.entity';

@Injectable()
export class AgsService {
  private readonly logger = new Logger(AgsService.name);
  private tokenCache: AgsTokenCache | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly keysService: KeysService,
    private readonly gradingStrategyService: GradingStrategyService,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ContestParticipation)
    private readonly contestParticipationRepository: Repository<ContestParticipation>,
    @InjectRepository(ContestProblemResult)
    private readonly contestProblemResultRepository: Repository<ContestProblemResult>,
  ) {}

  async generateClientAssertionJwt(): Promise<string> {
    const clientId = this.configService.get<string>('lti.clientId') as string;
    const accessTokenUrl = this.configService.get<string>(
      'lti.accessTokenUrl',
    ) as string;
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: clientId,
      sub: clientId,
      aud: accessTokenUrl,
      iat: now,
      exp: now + 300, // 5 minutes
      jti: uuidv4(),
    };

    this.logger.debug(`JWT payload: ${JSON.stringify(payload)}`);

    const privateKeyPem = this.keysService.getPrivateKey();
    const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
    const jwks = this.keysService.getJwks();
    const kid = jwks.keys[0]?.kid;

    if (!kid) {
      throw new Error('Key ID (kid) not found in JWKS');
    }

    this.logger.debug(`Using kid: ${kid}`);

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid })
      .sign(privateKey);

    return jwt;
  }

  async getAccessToken(): Promise<string> {
    const tokenExpiryBuffer =
      this.configService.get<number>('lti.ags.tokenExpiryBuffer') ?? 60;
    const now = Math.floor(Date.now() / 1000);

    if (
      this.tokenCache &&
      this.tokenCache.expiresAt > now + tokenExpiryBuffer
    ) {
      this.logger.debug('Using cached AGS access token');
      return this.tokenCache.token;
    }

    this.logger.debug('Requesting new AGS access token from Moodle');
    const clientAssertion = await this.generateClientAssertionJwt();
    const accessTokenUrl = this.configService.get<string>(
      'lti.accessTokenUrl',
    ) as string;
    const requestTimeout =
      this.configService.get<number>('lti.ags.requestTimeout') ?? 10000;

    const scope = [
      AgsScope.LINEITEM,
      AgsScope.LINEITEM_READONLY,
      AgsScope.SCORE,
      AgsScope.RESULT_READONLY,
    ].join(' ');

    try {
      this.logger.debug(`Requesting token from: ${accessTokenUrl}`);
      this.logger.debug(
        `JWT assertion (first 50 chars): ${clientAssertion.substring(0, 50)}...`,
      );

      const response = await axios.post<AgsAccessTokenResponse>(
        accessTokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_assertion_type:
            'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: clientAssertion,
          scope: scope,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: requestTimeout,
        },
      );

      const tokenResponse = response.data;
      this.tokenCache = {
        token: tokenResponse.access_token,
        expiresAt: now + tokenResponse.expires_in,
      };

      this.logger.log('AGS access token obtained successfully');
      return tokenResponse.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Failed to obtain AGS access token: ${error.message}`,
        );
        this.logger.error(`Status: ${error.response?.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response?.data)}`,
        );
        this.logger.error(`Request URL: ${accessTokenUrl}`);
      } else {
        this.logger.error(
          `Failed to obtain AGS access token: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      throw error;
    }
  }

  async sendScore(
    lineitemUrl: string,
    scoreDto: SendScoreDto,
  ): Promise<boolean> {
    const accessToken = await this.getAccessToken();

    // Parse URL and insert /scores before query string
    const url = new URL(lineitemUrl);
    const scoresUrl = `${url.origin}${url.pathname}/scores${url.search}`;

    const requestTimeout =
      this.configService.get<number>('lti.ags.requestTimeout') ?? 10000;

    try {
      this.logger.debug(`Sending score to AGS: ${scoresUrl}`);

      await axios.post(scoresUrl, scoreDto, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        },
        timeout: requestTimeout,
      });

      this.logger.log(
        `Score sent successfully to Moodle for user ${scoreDto.userId}`,
      );
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        this.logger.error(
          `Failed to send score to AGS: ${axiosError.message}`,
          JSON.stringify({
            status: axiosError.response?.status,
            data: axiosError.response?.data,
            url: scoresUrl,
          }),
        );
      } else {
        this.logger.error(
          `Failed to send score to AGS: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      throw error;
    }
  }

  async sendGradeForSubmission(submissionId: number): Promise<boolean> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: [
          'ltiLaunchSession',
          'ltiLaunchSession.contest',
          'problem',
          'user',
          'contestParticipation',
          'contestParticipation.contest',
        ],
      });

      if (!submission) {
        this.logger.warn(`Submission ${submissionId} not found`);
        return false;
      }

      let scoreToSend: number;
      let maxScore: number;
      let comment: string;

      // Check if this is a contest submission
      if (submission.contestParticipation) {
        this.logger.log(
          `Submission ${submissionId} is part of contest ${submission.contestParticipation.contest.id}`,
        );

        // Calculate aggregated contest score using the strategy service
        const contestScore =
          await this.gradingStrategyService.executeContestStrategy(
            submission.contestParticipation.id,
          );

        scoreToSend = contestScore.userScore;
        maxScore = contestScore.maxScore;

        // Update contest_participation.finalScore
        await this.contestParticipationRepository.update(
          submission.contestParticipation.id,
          { finalScore: scoreToSend },
        );

        // Update contest_problem_result for each problem
        for (const problemResult of contestScore.problemBreakdown) {
          let result = await this.contestProblemResultRepository.findOne({
            where: {
              contestParticipation: { id: submission.contestParticipation.id },
              problem: { id: problemResult.problemId },
            },
          });

          if (!result) {
            result = this.contestProblemResultRepository.create({
              contestParticipation: submission.contestParticipation,
              problem: { id: problemResult.problemId },
            });
          }

          result.score = problemResult.score;
          result.status = problemResult.status;

          await this.contestProblemResultRepository.save(result);
        }

        // Build detailed comment
        const breakdown = contestScore.problemBreakdown
          .map(
            (p) => `  Problem ${p.problemId}: ${p.score}/${p.maxScore} points`,
          )
          .join('\n');

        comment = [
          `Contest: ${submission.contestParticipation.contest.name}`,
          `Total Score: ${scoreToSend}/${maxScore}`,
          '',
          'Breakdown:',
          breakdown,
        ].join('\n');
      } else {
        // Standalone problem submission - use existing strategy logic
        const strategyResult =
          await this.gradingStrategyService.executeStrategy(submissionId);

        if (!strategyResult?.shouldSendGrade) {
          this.logger.debug(
            `Strategy determined not to send grade for submission ${submissionId}`,
          );
          return false;
        }

        scoreToSend = strategyResult.scoreToSend;
        maxScore = submission.problem.maxScore;
        comment = strategyResult.comment;
      }

      // LTI Checks
      if (!submission.ltiLaunchSession) {
        this.logger.debug(
          `Submission ${submissionId} has no LTI launch session`,
        );
        return false;
      }

      const session = submission.ltiLaunchSession;

      if (!session.agsLineitemUrl) {
        this.logger.warn(`LTI session ${session.id} has no AGS lineitem URL`);
        return false;
      }

      if (!session.agsScopes?.includes(AgsScope.SCORE)) {
        this.logger.warn(
          `LTI session ${session.id} does not have AGS SCORE scope`,
        );
        return false;
      }

      const scoreDto: SendScoreDto = {
        userId: session.ltiUserId,
        scoreGiven: scoreToSend,
        scoreMaximum: maxScore,
        comment,
        timestamp: new Date().toISOString(),
        activityProgress: AgsActivityProgress.COMPLETED,
        gradingProgress: AgsGradingProgress.FULLY_GRADED,
      };

      // Send score to Moodle
      await this.sendScore(session.agsLineitemUrl, scoreDto);

      this.logger.log(
        `Grade passback successful for submission ${submissionId} (score: ${scoreToSend}/${maxScore})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error in sendGradeForSubmission for ${submissionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
