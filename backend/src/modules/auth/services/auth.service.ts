import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { findUserByUsername, comparePassword, seedUsers, upsertGoogleUser } from '../models/user.model';
import { JWT_SECRET } from '../../../config/jwt';

dotenv.config();

export const JWT_EXPIRES_IN = '1min';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: 'ADMIN' | 'USER';
  email?: string | null;
  picture?: string | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: AuthenticatedUser;
}

export class AuthService {
  async login({ username, password }: LoginInput): Promise<LoginResponse> {
    if (!username || !password) {
      return { success: false, message: 'Usuario y contraseña son obligatorios.' };
    }

    await seedUsers();

    const user = await findUserByUsername(username);
    if (!user || !user.password) {
      return { success: false, message: 'Credenciales incorrectas.' };
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return { success: false, message: 'Credenciales incorrectas.' };
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    return {
      success: true,
      message: 'Login exitoso.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        picture: user.picture
      }
    };
  }

  /**
   * Valida el ID Token de Google (Google Identity Services), busca al usuario
   * por su correo y lo registra automáticamente si es la primera vez.
   */
  async loginWithGoogle(credential: string): Promise<LoginResponse> {
    if (!credential) {
      return { success: false, message: 'No se recibió la credencial de Google.' };
    }

    if (!GOOGLE_CLIENT_ID) {
      return {
        success: false,
        message: 'El login con Google no está configurado en el servidor (GOOGLE_CLIENT_ID).'
      };
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.email_verified) {
        return { success: false, message: 'La cuenta de Google no tiene un correo verificado.' };
      }

      const user = await upsertGoogleUser({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub
      });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      return {
        success: true,
        message: 'Login con Google exitoso.',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          picture: user.picture
        }
      };
    } catch (error) {
      console.error('Error validando el token de Google:', error);
      return { success: false, message: 'Token de Google inválido o expirado.' };
    }
  }
}
