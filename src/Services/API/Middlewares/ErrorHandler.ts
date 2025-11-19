// src/Services/API/Middlewares/ErrorHandler.ts
import type { Request, Response, NextFunction } from 'express';

export default function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the full error server-side
  console.error('=== ERROR-MIDDLEWARE START ===');
  console.error(err && err.stack ? err.stack : err);
  console.error('=== ERROR-MIDDLEWARE END ===');

  const isDev = process.env.NODE_ENV !== 'production';
  const status = (err && err.statusCode) ? err.statusCode : 500;
  const message = (err && err.message) ? err.message : 'Internal Server Error';

  // Send JSON body with message and stack (dev only)
  return res.status(status).json({
    message,
    ...(isDev ? { stack: err.stack || null, details: err?.errors || null } : {})
  });
}
