import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_cambiar_en_produccion';
