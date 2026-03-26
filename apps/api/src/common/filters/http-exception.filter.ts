import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let errors: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const obj = exceptionResponse as any;
        message = obj.message || message;
        errors = obj.errors;

        // Handle class-validator array messages
        if (Array.isArray(message)) {
          // Deduplicate error messages
          const unique = [...new Set(message as string[])];
          errors = unique.map((m) => ({ message: m }));
          message = 'Dados inválidos';
        }
        // Deduplicate errors array if present
        if (errors && Array.isArray(errors)) {
          const seen = new Set<string>();
          errors = errors.filter((e) => {
            const key = e.message || e.field || JSON.stringify(e);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);

      // Handle TypeORM-specific errors with user-friendly messages
      const errorName = (exception as any).constructor?.name;
      if (errorName === 'QueryFailedError') {
        const detail = (exception as any).detail;
        if ((exception as any).code === '23505') {
          status = HttpStatus.CONFLICT;
          const field = detail?.match(/Key \((\w+)\)/)?.[1];
          const fieldMessages: Record<string, string> = {
            slug: 'Já existe um estabelecimento com esse slug/código.',
            email: 'Já existe um cadastro com esse e-mail.',
            phone: 'Já existe um cadastro com esse telefone.',
            code: 'Já existe um registro com esse código.',
            name: 'Já existe um registro com esse nome.',
            key: 'Já existe uma permissão com essa chave.',
          };
          message = (field && fieldMessages[field]) || 'Já existe um registro com esses dados. Verifique e tente novamente.';
        } else if ((exception as any).code === '23503') {
          status = HttpStatus.BAD_REQUEST;
          message = 'Operação inválida: referência a registro inexistente.';
        } else if ((exception as any).code === '23502') {
          status = HttpStatus.BAD_REQUEST;
          message = 'Dados incompletos: campo obrigatório não informado.';
        } else {
          message = 'Erro interno do servidor. Tente novamente.';
        }
      } else {
        message = 'Erro interno do servidor. Tente novamente.';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
    });
  }
}
