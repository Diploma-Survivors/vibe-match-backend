import { Controller, Get, Redirect, Post, Body } from '@nestjs/common';
import { LtiService } from './lti.service';
import { KeysService } from './keys.service';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';

@Controller()
export class LtiController {
  constructor(
    private readonly ltiService: LtiService,
    private readonly keysService: KeysService,
  ) {}

  @Get('.well-known/jwks.json')
  public getJwks(): object {
    return this.keysService.getJwks();
  }

  @Post('lti/login')
  @Redirect()
  public handleLoginInitiation(
    @Body() ltiLoginInitiationDto: LtiLoginInitiationDto,
  ): { url: string } {
    const redirectUrl = this.ltiService.handleLoginInitiation(
      ltiLoginInitiationDto,
    );
    return { url: redirectUrl };
  }

  @Post('lti/launch')
  public async handleLtiLaunch(
    @Body() ltiLaunchRequestDto: LtiLaunchRequestDto,
  ): Promise<string> {
    // TODO: Handle LTI launch
    const launchResult =
      await this.ltiService.handleLtiLaunch(ltiLaunchRequestDto);
    return launchResult;
  }
}
