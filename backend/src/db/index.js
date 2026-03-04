import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'nail_salon',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
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
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_price INTEGER;
      ALTER TABLE services ALTER COLUMN price DROP NOT NULL;

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price INTEGER,
        category VARCHAR(50) DEFAULT 'servicio',
        active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Servicios por defecto (solo si la tabla está vacía)
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
      WHERE NOT EXISTS (SELECT 1 FROM services LIMIT 1);

      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        title VARCHAR(100),
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('Error inicializando base de datos:', err.message);
    throw err;
  } finally {
    client.release();
  }
};