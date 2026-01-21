-- Base de datos inicial para Bar-Ops (Roig Arena)

-- Tabla de zonas con tiempos ida/vuelta desde Parking (Origen Cero)
CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  travel_minutes INTEGER NOT NULL
);

-- Tabla de accesorios con tiempos extra
CREATE TABLE IF NOT EXISTS accessories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  extra_minutes INTEGER NOT NULL
);

-- Tabla de módulos base para montaje
CREATE TABLE IF NOT EXISTS bar_modules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  base_minutes INTEGER NOT NULL
);

-- Tabla de personal fijo
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  monthly_hours INTEGER NOT NULL,
  hourly_cost NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  zone_id INTEGER REFERENCES zones(id),
  required_hours INTEGER DEFAULT 0,
  bar_config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Datos de zonas
INSERT INTO zones (name, travel_minutes) VALUES
  ('Pista', 15),
  ('Auditorio', 8),
  ('Hall', 5),
  ('VIP', 12)
ON CONFLICT DO NOTHING;

-- Datos de accesorios
INSERT INTO accessories (name, extra_minutes) VALUES
  ('Tiradores', 10),
  ('Botelleros', 15),
  ('Vitrinas', 30),
  ('PMR', 20)
ON CONFLICT DO NOTHING;

-- Datos de módulos base (para cálculo interno)
INSERT INTO bar_modules (name, base_minutes) VALUES
  ('Módulo estándar', 12),
  ('Esquinero', 8)
ON CONFLICT DO NOTHING;

-- Plantilla fija (coste 0€/h porque ya está pagado)
INSERT INTO staff (full_name, role, monthly_hours, hourly_cost) VALUES
  ('Juan Pérez', 'mozo', 160, 0),
  ('María Gómez', 'mozo', 160, 0),
  ('Carlos Ruiz', 'camarero', 140, 0)
ON CONFLICT DO NOTHING;
