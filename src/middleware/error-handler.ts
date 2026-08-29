import type { NextFunction, Request, Response } from 'express';
import type pino from 'pino';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const createErrorHandler = (logger: pino.Logger) => {
  return (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof AppError) {
      logger.warn({ err: error, details: error.details }, 'Handled application error');
      res.status(error.statusCode).json({
        error: error.message,
        details: error.details,
      });
      return;
    }

    if (error instanceof ZodError) {
      logger.warn({ err: error }, 'Unhandled zod validation error');
      res.status(400).json({
        error: 'Validation failed',
        details: error.flatten(),
      });
      return;
    }

    logger.error({ err: error }, 'Unhandled error');
    res.status(500).json({
      error: 'Internal server error',
    });
  };
};
