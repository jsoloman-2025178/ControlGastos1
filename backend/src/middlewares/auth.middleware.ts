import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
  role?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'No se proporciono un token de autenticacion.'
    });
    return;
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      username: string;
      role: string;
    };

    req.userId = decoded.id;
    req.username = decoded.username;
    req.role = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token invalido o expirado.'
    });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador.'
    });
    return;
  }
  next();
}