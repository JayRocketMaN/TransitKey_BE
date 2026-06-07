-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. TABLES
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  owner_id UUID, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE my_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Your custom auth
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'driver', 'passenger')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_company_owner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE companies ADD CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES my_users(id) ON DELETE SET NULL;

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES my_users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  bus_id TEXT NOT NULL,
  origin_name TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  ride_status TEXT DEFAULT 'scheduled' CHECK (ride_status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  occupied_seats INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES my_users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, passenger_id)
);

CREATE TABLE vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326), 
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_trip_location UNIQUE (trip_id)
);

-- 3. INDEXES
CREATE INDEX idx_users_company ON my_users(company_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX vehicle_locations_geo_idx ON vehicle_locations USING GIST (location);

-- 4. REALTIME (Crucial for the Handshake)
ALTER TABLE vehicle_locations REPLICA IDENTITY FULL;
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE vehicle_locations;
COMMIT;
