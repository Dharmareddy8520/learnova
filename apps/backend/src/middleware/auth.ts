import { Request, Response, NextFunction } from 'express';

// We augment the Express Request interface in src/types/express.d.ts so Request
// already contains user/logout/session/isAuthenticated. Use the standard Request type.
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // TypeScript knows req.user may exist because of our augmentation
    return next();
  }

  res.status(401).json({ error: 'Authentication required' });
};
