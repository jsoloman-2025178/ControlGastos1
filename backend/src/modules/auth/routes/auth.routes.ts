import { Router } from 'express';
import { login, googleLogin, googleClientId, refreshToken } from '../controllers/auth.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';

export const authRoutes: Router = Router();

authRoutes.post('/login', login);
authRoutes.post('/google', googleLogin);
authRoutes.get('/google/client-id', googleClientId);
authRoutes.post('/refresh', authMiddleware, refreshToken);
