import { Pool, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Hacer que las columnas DATE (OID 1082) se devuelvan como string 'YYYY-MM-DD'
// en lugar de un objeto Date. Esto evita desfases de zona horaria al serializar
// a JSON (ej: "2026-08-15T06:00:00.000Z" en UTC-6) que rompen el frontend.
types.setTypeParser(1082, (val) => val);

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gastos_db'
};

export const pool = new Pool({
  ...dbConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

export async function testConnection(): Promise<void> {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT current_database() AS db, version();');
    const row = result.rows[0];
    console.log(' Conexion a la base de datos PostgreSQL establecida correctamente.');
    console.log(`  Host: ${dbConfig.host} | Puerto: ${dbConfig.port} | BD: ${row.db}`);
  } catch (error) {
    console.error(' Error al conectar con la base de datos PostgreSQL:');
    console.error('  Revisa los valores en .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).');
    console.error(`  Detalle: ${(error as Error).message}`);
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function ensureDatabase(): Promise<void> {
  const adminPool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
    connectionTimeoutMillis: 10000
  });

  try {
    const check = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbConfig.database]);
    if (check.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(` Base de datos "${dbConfig.database}" creada correctamente.`);
    } else {
      console.log(` Base de datos "${dbConfig.database}" ya existe.`);
    }
  } finally {
    await adminPool.end();
  }
}