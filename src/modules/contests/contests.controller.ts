import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/interfaces/jwt.interface';
import { ContestsService } from './contests.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RoleEnum } from '../user/enums/role.enum';

@Controller('contests')
@ApiTags('Contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new contest',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contest created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  async createContest(
    @Body() createContestDto: CreateContestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contestsService.createContest(createContestDto, user);
  }
}
