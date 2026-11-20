import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { validationPipe } from './common/validation.js';
import type { Env } from './config/env.js';

/** Configuração compartilhada entre o main.ts e os testes e2e. */
export function setupApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService<Env, true>);
  const origin = config.get('CORS_ORIGIN', { infer: true });

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({ origin: origin === '*' ? '*' : origin.split(',') });
  app.useGlobalPipes(validationPipe());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('JWT Auth API')
      .setDescription(
        'Autenticação com access token JWT, refresh token com rotação e detecção de reuso, sessões e RBAC.',
      )
      .setVersion('3.0.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);

  return app;
}
