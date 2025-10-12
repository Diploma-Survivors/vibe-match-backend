import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SkipTransformResponse } from 'src/common/decorators/skip-transform.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { type JwtPayload } from '../auth/interfaces/jwt.interface';
import { RoleEnum } from '../user/enums/role.enum';
import { GetJwksResponseDto } from './dto/get-jwks-response.dto';
import { LtiDeepLinkingRequestDto } from './dto/lti-deep-linking-request.dto';
import { LtiLaunchRequestDto } from './dto/lti-launch-request.dto';
import { LtiLoginInitiationDto } from './dto/lti-login-initiation.dto';
import { LtiResourceLinkDto } from './dto/lti-resource-link.dto';
import { LtiLaunchResponse } from './interfaces/lti.interface';
import { KeysService } from './keys.service';
import { LtiService } from './lti.service';

const htmlResponseExample = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting...</title>
</head>
<body>
    <form id="postRedirectForm" action="..." method="POST">
        <input type="hidden" name="accessToken" value="..." /> <!-- Changed name to accessToken -->
        <input type="hidden" name="refreshToken" value="..." /> <!-- Added refreshToken -->
        <input type="hidden" name="deviceId" value="..." /> <!-- Added deviceId -->
        <input type="hidden" name="redirect" value="..." />
    </form>
    <script type="text/javascript">
        document.getElementById('postRedirectForm').submit();
    </script>
</body>
</html>`;

@Controller()
export class LtiController {
  private readonly logger = new Logger(LtiController.name);

  constructor(
    private readonly ltiService: LtiService,
    private readonly keysService: KeysService,
  ) {}

  @Get('.well-known/jwks.json')
  @ApiOperation({
    summary: 'Get the JSON Web Key Set (JWKS)',
    description:
      'Retrieves the JSON Web Key Set (JWKS) used for verifying JWT signatures.',
  })
  @ApiResponse({
    status: 200,
    description: 'The JWKS object.',
    type: () => GetJwksResponseDto,
  })
  @SkipTransformResponse()
  public getJwks(): object {
    return this.keysService.getJwks();
  }

  @Post('lti/login')
  @ApiOperation({
    summary: 'LTI Login Initiation',
    description:
      'Handles LTI login initiation requests and redirects to the appropriate URL.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to the LTI platform for authentication.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data.',
  })
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
  @ApiOperation({
    summary: 'LTI Launch',
    description:
      'Handles LTI launch requests and redirects to the appropriate URL with tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully processed LTI launch request.',
    content: {
      'text/html': {
        schema: {
          type: 'string',
          example: htmlResponseExample,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data.',
  })
  public async handleLtiLaunch(
    @Body() ltiLaunchRequestDto: LtiLaunchRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const formData = await this.ltiService.handleLtiLaunch(ltiLaunchRequestDto);
    this.sendPostRedirectForm(res, formData);
  }

  @Post('lti/dl/request')
  @ApiOperation({
    summary: 'LTI Deep Linking Request',
    description:
      'Handles LTI deep linking requests and redirects to the appropriate URL with tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully processed LTI deep linking request.',
    content: {
      'text/html': {
        schema: {
          type: 'string',
          example: htmlResponseExample,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data.',
  })
  public async handleDeepLinkingRequest(
    @Body() ltiDeepLinkingDto: LtiDeepLinkingRequestDto,
    @Res() res: Response,
  ) {
    const formData =
      await this.ltiService.handleDeepLinkingRequest(ltiDeepLinkingDto);
    this.sendPostRedirectForm(res, formData);
  }

  @Post('lti/dl/response')
  @ApiOperation({
    summary: 'LTI Deep Linking Response',
    description:
      'Handles LTI deep linking responses and redirects to the platform with the appropriate JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully processed LTI deep linking response.',
    content: {
      'text/html': {
        schema: {
          type: 'string',
          example: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Redirecting...</title>
            </head>
            <body>
                <form id="postRedirectForm" action="..." method="POST">
                    <input type="hidden" name="JWT" value="..." />
                </form>
                <script type="text/javascript">
                    document.getElementById('postRedirectForm').submit();
                </script>
            </body>
            </html>`,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.INSTRUCTOR)
  public async handleDeepLinkingResponse(
    @Body() ltiDeepLinkingResponse: LtiResourceLinkDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { deviceId, ...ltiDeepLinking } = ltiDeepLinkingResponse;

    const { jwt, deepLinkReturnUrl } =
      (await this.ltiService.handleDeepLinkingResponse(
        deviceId as string,
        user.courseId as string,
        ltiDeepLinking,
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
