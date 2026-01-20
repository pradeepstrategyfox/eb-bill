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
  type TEXT NOT NULL,
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

CREATE POLICY "Users can manage own usage logs" ON ps_appliance_usage_logs FOR ALL TO authenticated 
USING (appliance_id IN (
    SELECT a.id FROM ps_appliances a 
    JOIN ps_rooms r ON a.room_id = r.id 
    JOIN ps_homes h ON r.home_id = h.id 
    WHERE h.user_id = auth.uid()
));

CREATE POLICY "Users can manage own billing cycles" ON ps_billing_cycles FOR ALL TO authenticated 
USING (home_id IN (SELECT id FROM ps_homes WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own meter readings" ON ps_meter_readings FOR ALL TO authenticated 
USING (home_id IN (SELECT id FROM ps_homes WHERE user_id = auth.uid()));

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
    last_log_id UUID;
    v_now TIMESTAMPTZ := NOW();
    app_wattage NUMERIC;
BEGIN
    -- 1. Get current appliance state
    SELECT * INTO app_record FROM ps_appliances WHERE id = target_appliance_id;
    
    IF app_record IS NULL THEN
        RAISE EXCEPTION 'Appliance not found: %', target_appliance_id;
    END IF;
    
    app_wattage := app_record.wattage;
    
    IF app_record.is_on THEN
        -- 2. Turning OFF - Find the active log and close it
        SELECT id INTO last_log_id 
        FROM ps_appliance_usage_logs 
        WHERE appliance_id = target_appliance_id AND turned_off_at IS NULL 
        ORDER BY turned_on_at DESC 
        LIMIT 1;
        
        IF last_log_id IS NOT NULL THEN
            UPDATE ps_appliance_usage_logs SET 
                turned_off_at = v_now,
                duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (v_now - turned_on_at)))::INTEGER,
                energy_consumed_kwh = (app_wattage / 1000.0) * (EXTRACT(EPOCH FROM (v_now - turned_on_at)) / 3600.0)
            WHERE id = last_log_id;
        END IF;
        
        UPDATE ps_appliances SET is_on = FALSE WHERE id = target_appliance_id;
    ELSE
        -- 3. Turning ON - Create a new log entry
        INSERT INTO ps_appliance_usage_logs (appliance_id, turned_on_at, wattage) 
        VALUES (target_appliance_id, v_now, app_wattage);
        
        UPDATE ps_appliances SET is_on = TRUE WHERE id = target_appliance_id;
    END IF;
    
    -- 4. Return the updated appliance record
    SELECT * INTO app_record FROM ps_appliances WHERE id = target_appliance_id;
    RETURN app_record;
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
CREATE OR REPLACE FUNCTION calculate_bill_amount(units FLOAT)
RETURNS FLOAT AS $$
DECLARE
    bill_total FLOAT := 0;
    remaining_units FLOAT := units;
    slab_record RECORD;
    units_in_slab FLOAT;
    highest_fixed_charge FLOAT := 0;
BEGIN
    -- 1. Iterate through active slabs in order
    FOR slab_record IN 
        SELECT * FROM ps_tariff_slabs 
        WHERE is_active = TRUE 
        ORDER BY min_units ASC 
    LOOP
        IF remaining_units <= 0 THEN
            EXIT;
        END IF;

        -- Calculate units that fall into this slab
        IF slab_record.max_units IS NULL THEN
            units_in_slab := remaining_units;
        ELSE
            units_in_slab := LEAST(remaining_units, slab_record.max_units - slab_record.min_units + 1);
        END IF;

        -- Add to total with subsidy applied
        bill_total := bill_total + (units_in_slab * slab_record.rate_per_unit * (1 - COALESCE(slab_record.subsidy_percentage, 0) / 100));
        
        -- Track highest fixed charge
        highest_fixed_charge := GREATEST(highest_fixed_charge, COALESCE(slab_record.fixed_charge, 0));
        
        remaining_units := remaining_units - units_in_slab;
    END LOOP;

    -- 2. Add the fixed charge
    bill_total := bill_total + highest_fixed_charge;

    RETURN ROUND(bill_total::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

        WHERE id = cycle_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_all_billing_estimates()
RETURNS VOID AS $$
DECLARE
    cycle_record RECORD;
    calculated_units FLOAT;
BEGIN
    FOR cycle_record IN SELECT * FROM ps_billing_cycles WHERE is_active = TRUE LOOP
        -- 1. Calculate active units
        SELECT COALESCE(SUM(energy_consumed_kwh), 0) INTO calculated_units
        FROM ps_appliance_usage_logs l
        JOIN ps_appliances a ON l.appliance_id = a.id
        JOIN ps_rooms r ON a.room_id = r.id
        WHERE r.home_id = cycle_record.home_id
        AND l.turned_on_at >= cycle_record.start_date;

        -- 2. Update the cycle
        UPDATE ps_billing_cycles SET 
            total_units = calculated_units,
            estimated_bill = calculate_bill_amount(calculated_units),
            updated_at = NOW()
        WHERE id = cycle_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. On-demand sync for a specific home (Used by frontend)
-- This version includes REAL-TIME calculation for appliances currently running
CREATE OR REPLACE FUNCTION sync_billing_estimate(home_id_param UUID)
RETURNS VOID AS $$
DECLARE
    active_cycle_record RECORD;
    completed_units FLOAT;
    running_units FLOAT;
    total_units_sum FLOAT;
BEGIN
    SELECT * INTO active_cycle_record FROM ps_billing_cycles WHERE home_id = home_id_param AND is_active = TRUE LIMIT 1;
    IF active_cycle_record IS NULL THEN RETURN; END IF;

    -- A. Calculate units from FINISHED sessions
    SELECT COALESCE(SUM(energy_consumed_kwh), 0) INTO completed_units
    FROM ps_appliance_usage_logs l
    JOIN ps_appliances a ON l.appliance_id = a.id
    JOIN ps_rooms r ON a.room_id = r.id
    WHERE r.home_id = home_id_param AND l.turned_off_at IS NOT NULL
    AND l.turned_on_at >= active_cycle_record.start_date;

    -- B. Calculate units from CURRENTLY RUNNING appliances (Realtime)
    SELECT COALESCE(SUM((a.wattage / 1000.0) * (EXTRACT(EPOCH FROM (NOW() - l.turned_on_at)) / 3600.0)), 0) INTO running_units
    FROM ps_appliance_usage_logs l
    JOIN ps_appliances a ON l.appliance_id = a.id
    JOIN ps_rooms r ON a.room_id = r.id
    WHERE r.home_id = home_id_param AND l.turned_off_at IS NULL
    AND l.turned_on_at >= active_cycle_record.start_date;

    total_units_sum := completed_units + running_units;

    -- C. Update the cycle
    UPDATE ps_billing_cycles SET 
        total_units = total_units_sum,
        estimated_bill = calculate_bill_amount(total_units_sum),
        updated_at = NOW()
    WHERE id = active_cycle_record.id;
END;
$$ LANGUAGE plpgsql;
```

### Step 3: Populate Default Tariff Slabs
Run this to ensure your bill calculations work immediately:

```sql
INSERT INTO ps_tariff_slabs (min_units, max_units, rate_per_unit, fixed_charge, subsidy_percentage, is_active)
VALUES 
(0, 100, 0, 0, 100, true),
(101, 200, 2.25, 20, 0, true),
(201, 400, 4.50, 30, 0, true),
(401, NULL, 6.00, 50, 0, true)
ON CONFLICT DO NOTHING;
```

### Step 4: Schedule the Background Job
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

## 8. Frontend Theme Implementation
The app now respects the user's system theme preference by default.

### Implementation:
```javascript
// In App.jsx and DashboardLayout.jsx
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme;
  
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};
```

### Behavior:
| Scenario | Result |
|---|---|
| New user with Dark Mode OS | App starts in Dark Mode |
| New user with Light Mode OS | App starts in Light Mode |
| User manually toggles theme | Preference saved to localStorage |
| User clears localStorage | Reverts to system preference |

---

## 9. Summary of Advantages
1. **Zero Maintenance**: No need to manage a Node.js server, PM2, or SSL certificates for the backend.
2. **Built-in Scalability**: Supabase handles connection pooling and high availability.
3. **Instant Latency**: Direct client-to-DB connections are faster than routing through an Express server.
4. **Realtime included**: WebSockets are built-in for live load monitoring.
5. **Real-time Billing**: Frontend calculates active session consumption on-the-fly.
6. **System Theme Respect**: App automatically matches user's OS theme preference.
