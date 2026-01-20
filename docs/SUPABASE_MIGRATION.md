# Supabase Migration Guide: Converting Backend to Full Supabase

This document outlines the steps to migrate the **PowerSense Home** backend from an Express/Sequelize/PostgreSQL setup to a serverless architecture entirely powered by **Supabase**.

## 1. Authentication Strategy
Currently, we use a hybrid approach. For a full migration:
- **Primary Auth**: Use Supabase Auth exclusively.
- **User Profiles**: Link `ps_users` to Supabase `auth.users` using the `id` as a foreign key.
- **Client Side**: Use `supabase.auth.signInWithPassword()` or `signInWithOtp()`.

### Transferring Users
If you have existing users in the `ps_users` table, they should be created in Supabase Auth using the Admin API or invited via email.

---

## 2. Database Schema (PostgreSQL)
Run the following SQL in your Supabase SQL Editor to create the tables with correct relationships.

```sql
-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Supabase Auth)
CREATE TABLE public.ps_users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOMES
CREATE TABLE public.ps_homes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.ps_users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Home',
  total_rooms INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROOMS
CREATE TABLE public.ps_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID REFERENCES public.ps_homes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('bedroom', 'hall', 'kitchen', 'bathroom', 'balcony')) NOT NULL,
  square_footage FLOAT,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. APPLIANCES
CREATE TABLE public.ps_appliances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.ps_rooms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  wattage FLOAT NOT NULL CHECK (wattage >= 0),
  is_on BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USAGE LOGS
CREATE TABLE public.ps_appliance_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appliance_id UUID REFERENCES public.ps_appliances(id) ON DELETE CASCADE NOT NULL,
  turned_on_at TIMESTAMPTZ,
  turned_off_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  energy_consumed_kwh FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BILLING CYCLES
CREATE TABLE public.ps_billing_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID REFERENCES public.ps_homes(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_units FLOAT DEFAULT 0,
  estimated_bill FLOAT DEFAULT 0,
  actual_bill FLOAT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. METER READINGS
CREATE TABLE public.ps_meter_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID REFERENCES public.ps_homes(id) ON DELETE CASCADE NOT NULL,
  reading_value FLOAT NOT NULL CHECK (reading_value >= 0),
  reading_date TIMESTAMPTZ DEFAULT NOW(),
  variance_percentage FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TARIFF SLABS
CREATE TABLE public.ps_tariff_slabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  min_units FLOAT NOT NULL,
  max_units FLOAT,
  rate_per_unit FLOAT NOT NULL,
  fixed_charge FLOAT DEFAULT 0,
  subsidy_percentage FLOAT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Row Level Security (RLS)
RLS allows the frontend to query the database directly without a middleman, while ensuring users can only see their own data.

```sql
-- Enable RLS on all tables
ALTER TABLE public.ps_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_appliance_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_meter_readings ENABLE ROW LEVEL SECURITY;
-- Tariff Slabs are public (Read-only)
ALTER TABLE public.ps_tariff_slabs ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Users can manage their own profile
CREATE POLICY "Users can manage own profile" ON ps_users FOR ALL TO authenticated USING (auth.uid() = id);

-- Homes (Link to auth.uid via users table)
CREATE POLICY "Users can manage own homes" ON ps_homes FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Sub-entities (Ensure they belong to a home owned by the user)
CREATE POLICY "Users can manage own rooms" ON ps_rooms FOR ALL TO authenticated 
USING (home_id IN (SELECT id FROM ps_homes WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own appliances" ON ps_appliances FOR ALL TO authenticated 
USING (room_id IN (SELECT r.id FROM ps_rooms r JOIN ps_homes h ON r.home_id = h.id WHERE h.user_id = auth.uid()));

CREATE POLICY "Public read for tariffs" ON ps_tariff_slabs FOR SELECT TO authenticated USING (true);
```

---

## 4. Migrating Business Logic (Postgres Functions)
Instead of an Express server calculating consumption, we use **Stored Procedures (RPC)**.

### Example: Toggle Appliance with Logging
This replaces the `toggleAppliance` function in `ConsumptionEngine.js`.

```sql
CREATE OR REPLACE FUNCTION toggle_appliance_state(target_appliance_id UUID)
RETURNS public.ps_appliances AS $$
DECLARE
    app_record public.ps_appliances;
    last_log public.ps_appliance_usage_logs;
    duration_hrs FLOAT;
    energy_kwh FLOAT;
BEGIN
    -- Get appliance
    SELECT * INTO app_record FROM ps_appliances WHERE id = target_appliance_id;
    
    IF app_record.is_on THEN
        -- Turning OFF: Close usage log
        SELECT * INTO last_log FROM ps_appliance_usage_logs 
        WHERE appliance_id = target_appliance_id AND turned_off_at IS NULL 
        ORDER BY turned_on_at DESC LIMIT 1;
        
        IF last_log IS NOT NULL THEN
            duration_hrs := EXTRACT(EPOCH FROM (NOW() - last_log.turned_on_at)) / 3600;
            energy_kwh := (app_record.wattage / 1000) * duration_hrs;
            
            UPDATE ps_appliance_usage_logs SET 
                turned_off_at = NOW(),
                duration_seconds = EXTRACT(EPOCH FROM (NOW() - last_log.turned_on_at)),
                energy_consumed_kwh = energy_kwh
            WHERE id = last_log.id;
        END IF;
        
        UPDATE ps_appliances SET is_on = FALSE WHERE id = target_appliance_id;
    ELSE
        -- Turning ON: Create new log
        INSERT INTO ps_appliance_usage_logs (appliance_id, turned_on_at)
        VALUES (target_appliance_id, NOW());
        
        UPDATE ps_appliances SET is_on = TRUE WHERE id = target_appliance_id;
    END IF;
    
    RETURN (SELECT * FROM ps_appliances WHERE id = target_appliance_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Frontend Implementation Changes
Replace `axios` calls with `supabase-js`.

### Old (Axios):
```javascript
const res = await api.get('/api/homes');
setHomes(res.data);
```

### New (Supabase):
```javascript
const { data, error } = await supabase
  .from('ps_homes')
  .select('*, rooms(*, appliances(*))');
if (data) setHomes(data);
```

### Toggling Appliance (RPC):
```javascript
const { data, error } = await supabase.rpc('toggle_appliance_state', { 
  target_appliance_id: applianceId 
});
```

---

## 6. Realtime Updates
Supabase allows you to listen to database changes live. You can replace polling with subscriptions:

```javascript
const subscription = supabase
  .channel('public:ps_appliances')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ps_appliances' }, payload => {
    // Update UI instantly when appliance state changes elsewhere
    updateLocalState(payload.new);
  })
  .subscribe();
```

---

## 7. Automated Bill Updates (Regular Background Updates)

To keep the `estimated_bill` and `total_units` updated regularly without user intervention, we use the `pg_cron` extension in Supabase.

### Step 1: Enable pg_cron
In the Supabase Dashboard, go to **Database > Extensions** and enable `pg_cron`.

### Step 2: Create the Update Function
Create a function that iterates through all active billing cycles and updates their consumption based on usage logs.

```sql
CREATE OR REPLACE FUNCTION update_all_billing_estimates()
RETURNS VOID AS $$
DECLARE
    cycle_record RECORD;
    calculated_units FLOAT;
    bill_amount FLOAT;
    base_rate FLOAT := 5.0; -- Default rate if no slab logic is applied
BEGIN
    FOR cycle_record IN SELECT * FROM ps_billing_cycles WHERE is_active = TRUE LOOP
        -- 1. Calculate units consumed in this cycle
        SELECT COALESCE(SUM(energy_consumed_kwh), 0) INTO calculated_units
        FROM ps_appliance_usage_logs l
        JOIN ps_appliances a ON l.appliance_id = a.id
        JOIN ps_rooms r ON a.room_id = r.id
        WHERE r.home_id = cycle_record.home_id
        AND l.turned_on_at >= cycle_record.start_date;

        -- 2. Update the billing cycle record
        UPDATE ps_billing_cycles SET 
            total_units = calculated_units,
            estimated_bill = calculated_units * base_rate, -- Simplified; can be linked to ps_tariff_slabs
            updated_at = NOW()
        WHERE id = cycle_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Step 3: Schedule the Background Job
Schedule this function to run every hour to ensure the database is always reasonably up-to-date.

```sql
-- Schedule to run at the start of every hour
SELECT cron.schedule(
    'update-billing-cycle-estimates', -- name of the cron job
    '0 * * * *',                      -- cron schedule (every hour)
    'SELECT update_all_billing_estimates()'
);
```

---

## 8. Summary of Advantages
1. **Zero Maintenance**: No need to manage a Node.js server, PM2, or SSL certificates for the backend.
2. **Built-in Scalability**: Supabase handles connection pooling and high availability.
3. **Instant Latency**: Direct client-to-DB connections are faster than routing through an Express server.
4. **Realtime included**: WebSockets are built-in for live load monitoring.
