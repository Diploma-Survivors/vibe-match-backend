import { IsString, IsNotEmpty } from 'class-validator';

export class LtiLaunchRequestDto {
  @IsString()
  @IsNotEmpty()
  id_token: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
