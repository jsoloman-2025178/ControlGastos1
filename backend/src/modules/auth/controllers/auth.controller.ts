import { Request, Response } from 'express';
import { AuthService, LoginInput, JWT_EXPIRES_IN } from '../services/auth.service';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { findUserByUsername } from '../models/user.model';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../../config/jwt';

const authService = new AuthService();

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const input: LoginInput = {
      username: req.body.username?.trim(),
      password: req.body.password
    };

    const result = await authService.login(input);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar el login.'
    });
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const credential: string = req.body.credential;
    const result = await authService.loginWithGoogle(credential);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error en login con Google:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar el login con Google.'
    });
  }
};

export const googleClientId = (_req: Request, res: Response): void => {
  res.status(200).json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
};

/**
 * Emite un nuevo token con tiempo de expiración renovado.
 * El authMiddleware ya validó el token antes de llegar aquí.
 */
export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await findUserByUsername(req.username!);
    if (!user) {
      res.status(401).json({ success: false, message: 'Usuario no encontrado.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error('Error en refresh:', error);
    res.status(500).json({ success: false, message: 'Error interno al renovar la sesión.' });
  }
};
