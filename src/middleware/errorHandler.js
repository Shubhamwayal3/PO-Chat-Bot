import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err.code === 'WORKBOOK_MISSING' || err.code === 'SHEET_NOT_FOUND') {
    return res.status(503).json({
      error: { code: err.code, message: err.message },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
