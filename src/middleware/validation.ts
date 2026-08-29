import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const validateBody = <T extends ZodType>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError(400, 'Request body validation failed', error.flatten()));
        return;
      }
      next(error);
    }
  };
};

export const validateParams = <T extends ZodType<Record<string, unknown>>>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError(400, 'Route parameter validation failed', error.flatten()));
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = <T extends ZodType<Record<string, unknown>>>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError(400, 'Query string validation failed', error.flatten()));
        return;
      }
      next(error);
    }
  };
};
