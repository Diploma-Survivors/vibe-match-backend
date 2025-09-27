import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SkipTransformResponse } from 'src/common/decorators/skip-transform.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RoleEnum } from '../user/enums/role.enum';
import { LtiDeepLinkingRequestDto } from './dto/lti-deep-linking-request.dto';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import { LtiResourceLinkDto } from './dto/lti-resource-link.dto';
import { LtiLaunchResponse } from './interfaces/lti.interface';
import { KeysService } from './keys.service';
import { LtiService } from './lti.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/interfaces/jwt.interface';

@Controller()
export class LtiController {
  private readonly logger = new Logger(LtiController.name);

  constructor(
    private readonly ltiService: LtiService,
    private readonly keysService: KeysService,
  ) {}

  @Get('.well-known/jwks.json')
  @SkipTransformResponse()
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
    const formData = await this.ltiService.handleLtiLaunch(ltiLaunchRequestDto);
    this.sendPostRedirectForm(res, formData);
  }

  @Post('lti/dl/request')
  public async handleDeepLinkingRequest(
    @Body() ltiDeepLinkingDto: LtiDeepLinkingRequestDto,
    @Res() res: Response,
  ) {
    const formData =
      await this.ltiService.handleDeepLinkingRequest(ltiDeepLinkingDto);
    this.sendPostRedirectForm(res, formData);
  }

  @Post('lti/dl/response')
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  public async handleDeepLinkingResponse(
    @Body() ltiDeepLinkingResponse: LtiResourceLinkDto,
    @Body('deviceId') deviceId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { jwt, deepLinkReturnUrl } =
      (await this.ltiService.handleDeepLinkingResponse(
        deviceId,
        user.courseId as string,
        ltiDeepLinkingResponse,
      )) as {
        jwt: string;
        deepLinkReturnUrl: string;
      };

    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting...</title>
      </head>
      <body>
          <form id="postRedirectForm" action="${deepLinkReturnUrl}" method="POST">
              <input type="hidden" name="JWT" value="${jwt}" />
          </form>
          <script type="text/javascript">
              document.getElementById('postRedirectForm').submit();
          </script>
      </body>
      </html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlResponse);
  }

  private sendPostRedirectForm(res: Response, formData: LtiLaunchResponse) {
    const {
      accessToken,
      refreshToken,
      deviceId,
      redirectPath,
      postRedirectUrl,
    } = formData;

    this.logger.debug(
      `Redirecting to ${postRedirectUrl} with Tokens and redirectPath with: ${JSON.stringify(formData)}`,
    );

    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting...</title>
      </head>
      <body>
          <form id="postRedirectForm" action="${postRedirectUrl}" method="POST">
              <input type="hidden" name="accessToken" value="${accessToken}" /> <!-- Changed name to accessToken -->
              <input type="hidden" name="refreshToken" value="${refreshToken}" /> <!-- Added refreshToken -->
              <input type="hidden" name="deviceId" value="${deviceId}" /> <!-- Added deviceId -->
              <input type="hidden" name="redirect" value="${redirectPath}" />
          </form>
          <script type="text/javascript">
              document.getElementById('postRedirectForm').submit();
          </script>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlResponse);
  }
}
