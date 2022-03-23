import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  OnModuleInit,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

import { Request, Response } from 'express';

import { KafkaTopics } from '@shared/constants/kafka-topics';

import { SignUpRequest } from '@shared/dto/auth/sign-up.dto';
import { SignInRequest } from '@shared/dto/auth/sign-in.dto';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController implements OnModuleInit {
  constructor(
    @Inject('AUTH-SERVICE') private readonly authClient: ClientKafka,
    private readonly authService: AuthService,
  ) {}

  onModuleInit() {
    for (const topic in KafkaTopics.AUTH) {
      this.authClient.subscribeToResponseOf(KafkaTopics.AUTH[topic]);
    }
  }

  @Post('signUp')
  async signUp(
    @Body() data: SignUpRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signUp(data);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return tokens.accessToken;
  }

  @Post('signIn')
  async signIn(
    @Body() data: SignInRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signIn(data);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return tokens.accessToken;
  }

  @Post('update')
  async updateToken(@Req() req: Request) {
    const { refreshToken } = req.cookies;

    if (!refreshToken) throw new BadRequestException('No refreshToken');

    const accessToken = await this.authService.updateToken(refreshToken);

    return accessToken;
  }
}
