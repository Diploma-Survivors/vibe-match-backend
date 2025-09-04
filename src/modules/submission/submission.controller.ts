import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmissionService } from './submission.service';
import { SubmitBatchDto } from './dto/submit-batch.dto';
import { BatchResultsResponseDto, GetBatchResultsDto } from './dto/batch-results.dto';
import { Judge0BatchSubmissionResponse } from './interfaces/judge0-batch.interface';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @ApiOperation({ summary: 'Submit code for execution' })
  @ApiResponse({
    status: 201,
    description: 'The code has been submitted successfully',
    type: Judge0BatchSubmissionResponse,
  })
  async submitCode(@Body() dto: SubmitBatchDto): Promise<Judge0BatchSubmissionResponse> {
    return this.submissionService.submitCode(dto);
  }

  @Post('results')
  @ApiOperation({ summary: 'Get results for submitted code' })
  @ApiResponse({
    status: 200,
    description: 'The results have been retrieved successfully',
    type: BatchResultsResponseDto,
  })
  async getResults(@Body() dto: GetBatchResultsDto): Promise<BatchResultsResponseDto> {
    return this.submissionService.getResults(dto);
  }
   @Post()
  @ApiOperation({ summary: 'Submit code for execution' })
  @ApiResponse({
    status: 201,
    description: 'The code has been submitted successfully',
    type: Judge0BatchSubmissionResponse,
  })
  async submitCode(@Body() dto: SubmitBatchDto): Promise<Judge0BatchSubmissionResponse> {
    return this.submissionService.submitCode(dto);
  }

  @Post('results')
  @ApiOperation({ summary: 'Get results for submitted code' })
  @ApiResponse({
    status: 200,
    description: 'The results have been retrieved successfully',
    type: BatchResultsResponseDto,
  })
  async getResults(@Body() dto: GetBatchResultsDto): Promise<BatchResultsResponseDto> {
    return this.submissionService.getResults(dto);
  }
}
