import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const isAuthenticated = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    req.user = req.user;
    return next();
  }
  
  res.status(401).json({ error: 'Authentication required' });
};
