// NestJS
import { ApiProperty } from '@nestjs/swagger';
import { BaseProblemResponseDto } from '../../problems/dto/base-problem-response.dto';
import { PaginationCursorResponseDto } from '../../../common/pagination/dtos/pagination-cursor-response.dto';
import { ContestParticipationDto } from './contest-participation.dto';

// Relative imports

export class LeaderboardRankingDto extends ContestParticipationDto {
  @ApiProperty({
    description: 'The rank of the participant',
    example: 1,
  })
  rank: number;

  @ApiProperty({
    description: 'Total penalty time (formatted as HH:MM or MM:SS)',
    example: '15:23',
  })
  totalTime: string;
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
