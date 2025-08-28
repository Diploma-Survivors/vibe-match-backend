import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { LtiService } from './lti.service';
import { KeysService } from './keys.service';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';
import type { Response } from 'express';
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
  public async handleLoginInitiation(
    @Body() ltiLoginInitiationDto: LtiLoginInitiationDto,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.ltiService.handleLoginInitiation(
      ltiLoginInitiationDto,
    );
    res.redirect(302, redirectUrl);
  }

  @Post('lti/launch')
  public async handleLtiLaunch(
    @Body() ltiLaunchRequestDto: LtiLaunchRequestDto,
  ): Promise<string> {
    const launchResult =
      await this.ltiService.handleLtiLaunch(ltiLaunchRequestDto);
    return launchResult;
  }
}
