import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

declare global {
  namespace Express {
    interface Request { user: { id: string }; }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'توكن مفقود' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    req.user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'توكن غير صالح' });
  }
}

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'مفتاح API مفقود' });
  const user = db.getUserByApiKey(apiKey);
  if (!user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'مفتاح API غير صالح' });
  req.user = { id: user.id };
  next();
}
