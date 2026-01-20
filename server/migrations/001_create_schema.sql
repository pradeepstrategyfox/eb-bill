-- PowerSense Home Database Schema

-- Create Users table (now prefixed as ps_users)
CREATE TABLE IF NOT EXISTS ps_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_id VARCHAR(255) UNIQUE, -- For Supabase Auth mapping
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255), -- Nullable since Supabase can handle auth
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Homes table
CREATE TABLE IF NOT EXISTS ps_homes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ps_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'My Home',
  total_rooms INTEGER NOT NULL CHECK (total_rooms >= 1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Rooms table
CREATE TABLE IF NOT EXISTS ps_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES ps_homes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bedroom', 'hall', 'kitchen', 'bathroom', 'balcony')),
  square_footage DECIMAL(10, 2),
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Appliances table
CREATE TABLE IF NOT EXISTS ps_appliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES ps_rooms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  wattage DECIMAL(10, 2) NOT NULL CHECK (wattage >= 0),
  is_on BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Appliance Usage Logs table
CREATE TABLE IF NOT EXISTS ps_appliance_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appliance_id UUID NOT NULL REFERENCES ps_appliances(id) ON DELETE CASCADE,
  turned_on_at TIMESTAMP,
  turned_off_at TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,
  energy_consumed_kwh DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Meter Readings table
CREATE TABLE IF NOT EXISTS ps_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES ps_homes(id) ON DELETE CASCADE,
  reading_value DECIMAL(10, 2) NOT NULL CHECK (reading_value >= 0),
  reading_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  variance_percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Billing Cycles table
CREATE TABLE IF NOT EXISTS ps_billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES ps_homes(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_units DECIMAL(10, 2) DEFAULT 0,
  estimated_bill DECIMAL(10, 2) DEFAULT 0,
  actual_bill DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Tariff Slabs table
CREATE TABLE IF NOT EXISTS ps_tariff_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_units DECIMAL(10, 2) NOT NULL,
  max_units DECIMAL(10, 2),
  rate_per_unit DECIMAL(10, 2) NOT NULL,
  fixed_charge DECIMAL(10, 2) DEFAULT 0,
  subsidy_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (subsidy_percentage >= 0 AND subsidy_percentage <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_homes_user_id ON ps_homes(user_id);
CREATE INDEX idx_rooms_home_id ON ps_rooms(home_id);
CREATE INDEX idx_appliances_room_id ON ps_appliances(room_id);
CREATE INDEX idx_usage_logs_appliance_id ON ps_appliance_usage_logs(appliance_id);
CREATE INDEX idx_usage_logs_created_at ON ps_appliance_usage_logs(created_at);
CREATE INDEX idx_meter_readings_home_id ON ps_meter_readings(home_id);
CREATE INDEX idx_billing_cycles_home_id ON ps_billing_cycles(home_id);
CREATE INDEX idx_billing_cycles_active ON ps_billing_cycles(is_active);
CREATE INDEX idx_tariff_slabs_active ON ps_tariff_slabs(is_active);
