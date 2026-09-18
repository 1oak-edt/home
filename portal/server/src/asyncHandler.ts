import type { NextFunction, Request, Response } from "express";

// Express 4 doesn't catch rejected promises from async route handlers, which turns
// any unhandled error into a crashed process instead of a 500 response. Wrap every
// async handler with this so errors are forwarded to Express's error middleware.
export function ah<P = any>(
  fn: (req: Request<P>, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request<P>, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
