import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'nail_salon',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

pool.on('error', (err) => {
  console.error('Error inesperado en cliente idle:', err);
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        whatsapp VARCHAR(20) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_hour SMALLINT NOT NULL CHECK (appointment_hour IN (8, 10, 12, 14, 16, 18)),
        status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(appointment_date, appointment_hour)
      );

      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

      -- Agregar columnas de servicio si no existen
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_name VARCHAR(150);
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_price INTEGER;
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price INTEGER,
        category VARCHAR(50) DEFAULT 'servicio',
        active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Permitir precio nulo en servicios
      ALTER TABLE services ALTER COLUMN price DROP NOT NULL;

      -- Servicios por defecto (solo si nunca se inicializaron antes)
      INSERT INTO settings (key, value)
      VALUES ('services_initialized', 'true')
      ON CONFLICT (key) DO NOTHING;

      INSERT INTO services (name, price, category, sort_order)
      SELECT * FROM (VALUES
        ('Manicuria básica (limado + cutículas + color)', 8000, 'manicuria', 1),
        ('Manicuria semipermanente', 12000, 'manicuria', 2),
        ('Esmaltado en gel', 15000, 'manicuria', 3),
        ('Manicuria express (solo color)', 5000, 'manicuria', 4),
        ('Nail art (diseño simple)', 3000, 'nail art', 5),
        ('Nail art (diseño elaborado)', 6000, 'nail art', 6),
        ('Esculpidas en acrílico', 25000, 'esculpidas', 7),
        ('Esculpidas en gel', 28000, 'esculpidas', 8),
        ('Retoque de esculpidas', 14000, 'esculpidas', 9),
        ('Kapping (refuerzo de uña natural)', 18000, 'esculpidas', 10),
        ('Remoción de esculpidas', 5000, 'esculpidas', 11)
      ) AS v(name, price, category, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'services_initialized');

      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        title VARCHAR(100),
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla de configuración global del negocio
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO settings (key, value)
      VALUES ('maintenance_mode', 'false')
      ON CONFLICT (key) DO NOTHING;

      INSERT INTO settings (key, value)
      VALUES ('maintenance_message', 'Estamos de vacaciones 🌴 Volvemos pronto. ¡Gracias por tu paciencia!')
      ON CONFLICT (key) DO NOTHING;
    `);
  } catch (err) {
    console.error('Error inicializando base de datos:', err.message);
    throw err;
  } finally {
    client.release();
  }
};