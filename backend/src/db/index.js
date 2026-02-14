import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nail_salon',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Inicializando base de datos...');
    
    // Drop tables if they exist (only for development/reset)
    // Uncomment these lines if you need to reset the database
    // await client.query(`DROP TABLE IF EXISTS appointments CASCADE`);
    // await client.query(`DROP TABLE IF EXISTS gallery CASCADE`);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        whatsapp VARCHAR(20) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_hour SMALLINT NOT NULL CHECK (appointment_hour >= 8 AND appointment_hour < 20),
        status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(appointment_date, appointment_hour)
      );

      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        title VARCHAR(100),
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('appointments', 'gallery')
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('✅ Database initialized successfully');
    console.log('📊 Tables structure:');
    result.rows.forEach(row => {
      console.log(`   ${row.table_name}.${row.column_name} (${row.data_type})`);
    });
    
  } catch (err) {
    console.error('❌ DB init error:', err.message);
    console.error('Full error:', err);
    throw err;
  } finally {
    client.release();
  }
};
