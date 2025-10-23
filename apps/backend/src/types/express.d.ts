import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
    logout?: any;
    session?: any;
    isAuthenticated?: () => this is Request;
  }
}
