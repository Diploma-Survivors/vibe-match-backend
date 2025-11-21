// NestJS
import { ApiProperty } from '@nestjs/swagger';
import { ProblemResultDto } from './problem-result.dto';
import { UserInformationDto } from '../../user/dto/user-information.dto';
import { BaseProblemResponseDto } from '../../problems/dto/base-problem-response.dto';
import { PaginationCursorResponseDto } from '../../../common/pagination/dtos/pagination-cursor-response.dto';

// Relative imports

export class LeaderboardRankingDto {
  @ApiProperty({
    description: 'The rank of the participant',
    example: 1,
  })
  rank: number;

  @ApiProperty({
    description: 'Information about the user',
    type: () => UserInformationDto,
    example: () => ({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john_doe@gmail.com',
    }),
  })
  user: UserInformationDto;

  @ApiProperty({
    description: 'Total score achieved in the contest',
    example: 500,
  })
  totalScore: number;

  @ApiProperty({
    description: 'Total penalty time (formatted as HH:MM or MM:SS)',
    example: '15:23',
  })
  totalTime: string;

  @ApiProperty({
    description: 'Results for each problem the user attempted',
    type: () => [ProblemResultDto],
  })
  problemResults: ProblemResultDto[];
}

export class LeaderboardResponseDto {
  @ApiProperty({
    description:
      'List of problems in the contest for building the table header',
    type: () => [BaseProblemResponseDto],
  })
  problems: BaseProblemResponseDto[];

  @ApiProperty({
    description: 'Leaderboard rankings with cursor pagination',
    type: () => PaginationCursorResponseDto,
  })
  rankings: PaginationCursorResponseDto<LeaderboardRankingDto>;
}
