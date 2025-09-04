import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { LtiService } from './lti.service';
import { KeysService } from './keys.service';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LtiLaunchResponse } from './interfaces/lti.interface';

@Controller()
export class LtiController {
  constructor(
    private readonly ltiService: LtiService,
    private readonly keysService: KeysService,
    private readonly configService: ConfigService,
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
    @Res() res: Response,
  ): Promise<void> {
    const { jwt, redirectPath } = JSON.parse(
      await this.ltiService.handleLtiLaunch(ltiLaunchRequestDto),
    ) as LtiLaunchResponse;

    const backendBaseUrl =
      this.configService.get<string>('appConfig.url') ||
      'http://localhost:3000';
    const postRedirectUrl = `${backendBaseUrl}/v1/auth/set-cookie-and-redirect`;

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting...</title>
      </head>
      <body>
          <form id="postRedirectForm" action="${postRedirectUrl}" method="POST">
              <input type="hidden" name="token" value="${jwt}" />
              <input type="hidden" name="redirect" value="${redirectPath}" />
          </form>
          <script type="text/javascript">
              document.getElementById('postRedirectForm').submit();
          </script>
      </body>
      </html>
    `);
  }
}
