import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => ({
          field: err.path.join('.').replace(/^(body|query|params)\./, ''),
          message: err.message,
        }));
        sendError(res, 'Doğrulama hatası (Validation Failed)', HTTP_STATUS.BAD_REQUEST, errorMessages);
        return;
      }
      sendError(res, 'Bilinmeyen bir doğrulama hatası oluştu', HTTP_STATUS.BAD_REQUEST);
    }
  };
};
