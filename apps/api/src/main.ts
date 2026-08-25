import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { AppModule } from './app.module';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

function errorLogDir(): string {
  const dir = join(process.cwd(), 'logs');
  try { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

function appendErrorLog(entry: string): void {
  try {
    const file = join(errorLogDir(), `errors-${new Date().toISOString().slice(0, 10)}.log`);
    appendFileSync(file, entry + '\n---\n', 'utf8');
  } catch {}
}

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: unknown = undefined;
    let stackForLog: string | undefined = undefined;
    let constructorName = 'Unknown';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') message = r;
      else if (r && typeof r === 'object') {
        message = String((r as any).message || message);
        details = r;
      }
      constructorName = exception.constructor.name;
      stackForLog = exception.stack;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      message = `Prisma error ${exception.code}`;
      details = {
        code: exception.code,
        meta: exception.meta,
        message: exception.message,
      };
      constructorName = exception.constructor.name;
      stackForLog = exception.stack;
      this.logger.error(
        `[Prisma ${exception.code}] ${exception.message} — ${request.method} ${request.url}`,
        exception.stack,
      );
    } else if (exception instanceof Error) {
      message = exception.message;
      constructorName = exception.constructor.name;
      stackForLog = exception.stack;
      this.logger.error(
        `[${exception.constructor.name}] ${exception.message} — ${request.method} ${request.url}`,
        exception.stack,
      );
    } else {
      constructorName = 'UnknownType';
      this.logger.error(
        `[Unknown] ${String(exception)} — ${request.method} ${request.url}`,
      );
    }

    try {
      appendErrorLog(
        `[${new Date().toISOString()}] ${request.method} ${request.url}` +
        `\nconstructor: ${constructorName}` +
        `\nhttp_status: ${status}` +
        `\nmessage: ${message}` +
        (details ? `\ndetails: ${JSON.stringify(details)}` : '') +
        (stackForLog ? `\nstack:\n${stackForLog}` : ''),
      );
    } catch {}

    const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
    const body: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    if (details !== undefined) body.details = details;
    if (isDev && stackForLog) {
      body.stack = stackForLog.split('\n').slice(0, 15);
    }
    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      (exception.code === 'P2002' || exception.code === 'P2025')
    ) {
      status = HttpStatus.BAD_REQUEST;
      body.statusCode = status;
    }

    response.status(status).json(body);
  }
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('SFE Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // -------------------------------------------------------------------------
  // CORS: por defecto, en desarrollo Vite proxpea /api — en producción hay
  // que listar los orígenes autorizados.
  // -------------------------------------------------------------------------
  const corsOrigin = process.env.CORS_ORIGIN ?? (process.env.NODE_ENV === 'production' ? false : true);
  if (corsOrigin !== false) {
    app.enableCors({
      origin: corsOrigin === true ? true : String(corsOrigin).split(',').map((s) => s.trim()),
      credentials: true,
    });
  }

  // -------------------------------------------------------------------------
  // Swagger / OpenAPI en GET /api/docs
  // Útil en desarrollo y QA. En producción (SIAT_AMBIENTE=1) se desactiva por
  // defecto a menos que se setee explicitamente SWAGGER_ENABLED=true.
  // -------------------------------------------------------------------------
  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ?? '').toLowerCase() === 'true' ||
    Number(process.env.SIAT_AMBIENTE ?? 2) !== 1;

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('SFE Facturación IC — API')
      .setDescription(
        'Sistema de Facturación Electrónica (Compra/Venta). Port de Laravel 5.7 + Vue 2 a NestJS + Prisma + React. ' +
        'Autenticación JWT Bearer en /api/auth/login y /api/auth/register. Autorización CASL por rol/permiso.',
      )
      .setVersion('0.1.0')
      .setContact('SFE Node', 'https://example.bo', 'facturacion@example.bo')
      .addServer(`http://localhost:${process.env.PORT ?? 3000}/api`, 'Servidor local')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
          description: 'Token JWT entregado por /api/auth/login',
        },
        'bearer',
      )
      .addTag('auth', 'Autenticación JWT')
      .addTag('users', 'Usuarios (requiere permiso users.*)')
      .addTag('roles', 'Roles de usuario')
      .addTag('permissions', 'Permisos CASL')
      .addTag('sale', 'Ventas, notas de venta y reportes de facturación')
      .addTag('inventory', 'Inventario, kardex, ingresos/salidas, almacenes')
      .addTag('siat', 'Sincronización, CUIS/CUFD y clientes SOAP SIAT')
      .addTag('company', 'Empresa, sucursales, puntos de venta y tokens SIAT')
      .addTag('system', 'Configuración general del sistema (solo SUPER_ADMIN)')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
      ignoreGlobalPrefix: false,
    });

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        displayOperationId: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'SFE API · Swagger UI',
      customCss: '.swagger-ui .topbar { background-color: #1f2937; }',
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`SFE API escuchando en http://localhost:${port}/api`);
  if (swaggerEnabled) {
    logger.log(`Swagger UI disponible en http://localhost:${port}/api/docs`);
  } else {
    logger.warn('Swagger deshabilitado (modo producción). Habilitar con SWAGGER_ENABLED=true.');
  }
}

void bootstrap();
