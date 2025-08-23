import { PartialType } from '@nestjs/swagger';
import { CreateTestCaseDto } from './create-testcase.dto';

export class UpdateTestcaseDto extends PartialType(CreateTestCaseDto) {}
