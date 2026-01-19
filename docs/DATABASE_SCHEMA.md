# PowerSense Home - Database Schema

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    POWERSENSE HOME                                       │
│                                   Database Schema v1.0                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   ps_tariff_    │
                                    │     slabs       │
                                    ├─────────────────┤
                                    │ id (PK, UUID)   │
                                    │ min_units       │
                                    │ max_units       │
                                    │ rate_per_unit   │
                                    │ fixed_charge    │
                                    │ subsidy_%       │
                                    │ is_active       │
                                    │ effective_from  │
                                    │ created_at      │
                                    │ updated_at      │
                                    └─────────────────┘
                                           (Standalone - TNEB Rates)


┌─────────────────┐
│    ps_users     │
├─────────────────┤
│ id (PK, UUID)   │◄─────────────────────────────────────────────────────────────────┐
│ email           │                                                                   │
│ phone           │                                                                   │
│ password_hash   │                                                                   │
│ name            │                                                                   │
│ created_at      │                                                                   │
│ updated_at      │                                                                   │
└─────────────────┘                                                                   │
        │                                                                             │
        │ 1:N (One User has Many Homes)                                               │
        ▼                                                                             │
┌─────────────────┐         1:N                ┌─────────────────────┐                │
│    ps_homes     │◄──────────────────────────►│  ps_billing_cycles  │                │
├─────────────────┤                            ├─────────────────────┤                │
│ id (PK, UUID)   │                            │ id (PK, UUID)       │                │
│ user_id (FK)────┼────────────────────────────│ home_id (FK)        │                │
│ name            │                            │ start_date          │                │
│ total_rooms     │         1:N                │ end_date            │                │
│ created_at      │◄─────────────────────────► │ total_units         │                │
│ updated_at      │                            │ estimated_bill      │                │
└─────────────────┘                            │ actual_bill         │                │
        │                                      │ is_active           │                │
        │                                      │ created_at          │                │
        │                                      │ updated_at          │                │
        │                                      └─────────────────────┘                │
        │                                                                             │
        │ 1:N (One Home has Many Rooms and Meter Readings)                            │
        │                                                                             │
        ├──────────────────────────────────────────┐                                  │
        │                                          │                                  │
        ▼                                          ▼                                  │
┌─────────────────┐                       ┌─────────────────────┐                     │
│    ps_rooms     │                       │  ps_meter_readings  │                     │
├─────────────────┤                       ├─────────────────────┤                     │
│ id (PK, UUID)   │                       │ id (PK, UUID)       │                     │
│ home_id (FK)    │                       │ home_id (FK)        │                     │
│ name            │                       │ reading_value       │                     │
│ type (ENUM)     │                       │ reading_date        │                     │
│   - bedroom     │                       │ variance_%          │                     │
│   - hall        │                       │ created_at          │                     │
│   - kitchen     │                       └─────────────────────┘                     │
│   - bathroom    │                                                                   │
│   - balcony     │                                                                   │
│ square_footage  │                                                                   │
│ position_x      │                                                                   │
│ position_y      │                                                                   │
│ created_at      │                                                                   │
│ updated_at      │                                                                   │
└─────────────────┘                                                                   │
        │                                                                             │
        │ 1:N (One Room has Many Appliances)                                          │
        ▼                                                                             │
┌─────────────────────┐                                                               │
│   ps_appliances     │                                                               │
├─────────────────────┤                                                               │
│ id (PK, UUID)       │                                                               │
│ room_id (FK)        │                                                               │
│ name                │                                                               │
│ type                │                                                               │
│ wattage             │                                                               │
│ is_on               │                                                               │
│ created_at          │                                                               │
│ updated_at          │                                                               │
└─────────────────────┘                                                               │
        │                                                                             │
        │ 1:N (One Appliance has Many Usage Logs)                                     │
        ▼                                                                             │
┌───────────────────────────┐                                                         │
│  ps_appliance_usage_logs  │                                                         │
├───────────────────────────┤                                                         │
│ id (PK, UUID)             │                                                         │
│ appliance_id (FK)         │                                                         │
│ turned_on_at              │                                                         │
│ turned_off_at             │                                                         │
│ duration_seconds          │                                                         │
│ energy_consumed_kwh       │                                                         │
│ created_at                │                                                         │
└───────────────────────────┘                                                         │
                                                                                      │
                                                                                      │
══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Table Definitions

### 1. `ps_users` - User Accounts
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_v4() | Unique user identifier |
| email | VARCHAR | UNIQUE, NULL | User's email address |
| phone | VARCHAR | UNIQUE, NULL | User's phone number |
| password_hash | VARCHAR | NOT NULL | Bcrypt hashed password |
| name | VARCHAR | NOT NULL | User's display name |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

---

### 2. `ps_homes` - User Homes
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique home identifier |
| user_id | UUID | FK → ps_users.id, NOT NULL | Owner reference |
| name | VARCHAR | NOT NULL, DEFAULT 'My Home' | Home name |
| total_rooms | INTEGER | NOT NULL, MIN 1 | Number of rooms |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Relationships:**
- `belongsTo` User (Many homes → One user)
- `hasMany` Rooms, BillingCycles, MeterReadings

---

### 3. `ps_rooms` - Rooms in Homes
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique room identifier |
| home_id | UUID | FK → ps_homes.id, NOT NULL | Parent home |
| name | VARCHAR | NOT NULL | Room name |
| type | ENUM | NOT NULL | bedroom, hall, kitchen, bathroom, balcony |
| square_footage | FLOAT | NULL | Room size in sq ft |
| position_x | INTEGER | DEFAULT 0 | UI layout position |
| position_y | INTEGER | DEFAULT 0 | UI layout position |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Relationships:**
- `belongsTo` Home
- `hasMany` Appliances

---

### 4. `ps_appliances` - Electrical Appliances
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique appliance identifier |
| room_id | UUID | FK → ps_rooms.id, NOT NULL | Parent room |
| name | VARCHAR | NOT NULL | Appliance display name |
| type | VARCHAR | NOT NULL | Appliance category |
| wattage | FLOAT | NOT NULL, MIN 0 | Power rating in Watts |
| is_on | BOOLEAN | DEFAULT FALSE | Current on/off state |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Relationships:**
- `belongsTo` Room
- `hasMany` ApplianceUsageLogs

---

### 5. `ps_appliance_usage_logs` - Usage Tracking
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique log identifier |
| appliance_id | UUID | FK → ps_appliances.id, NOT NULL | Appliance reference |
| turned_on_at | TIMESTAMP | NULL | When appliance was turned on |
| turned_off_at | TIMESTAMP | NULL | When appliance was turned off |
| duration_seconds | INTEGER | DEFAULT 0 | Usage duration |
| energy_consumed_kwh | FLOAT | DEFAULT 0 | Energy consumed in kWh |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |

**Relationships:**
- `belongsTo` Appliance

---

### 6. `ps_billing_cycles` - Billing Periods
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique cycle identifier |
| home_id | UUID | FK → ps_homes.id, NOT NULL | Home reference |
| start_date | DATE | NOT NULL | Billing period start |
| end_date | DATE | NOT NULL | Billing period end |
| total_units | FLOAT | DEFAULT 0 | Total kWh consumed |
| estimated_bill | FLOAT | DEFAULT 0 | AI-predicted bill amount |
| actual_bill | FLOAT | NULL | User-entered actual bill |
| is_active | BOOLEAN | DEFAULT TRUE | Current active cycle |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Relationships:**
- `belongsTo` Home

---

### 7. `ps_meter_readings` - Physical Meter Data
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique reading identifier |
| home_id | UUID | FK → ps_homes.id, NOT NULL | Home reference |
| reading_value | FLOAT | NOT NULL, MIN 0 | Meter reading in kWh |
| reading_date | TIMESTAMP | DEFAULT NOW() | When reading was taken |
| variance_percentage | FLOAT | NULL | Diff from predicted value |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |

**Relationships:**
- `belongsTo` Home

---

### 8. `ps_tariff_slabs` - TNEB Electricity Rates
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique slab identifier |
| min_units | FLOAT | NOT NULL | Slab minimum units |
| max_units | FLOAT | NULL (top slab) | Slab maximum units |
| rate_per_unit | FLOAT | NOT NULL | Cost per kWh |
| fixed_charge | FLOAT | DEFAULT 0 | Monthly fixed charge |
| subsidy_percentage | FLOAT | DEFAULT 0, 0-100 | Government subsidy % |
| is_active | BOOLEAN | DEFAULT TRUE | Currently applicable |
| effective_from | DATE | DEFAULT NOW() | When slab became effective |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Relationships:** Standalone (no foreign keys)

---

## Relationship Summary

```
User (1) ─────────────── (N) Home
                              │
                              ├──── (N) Room
                              │          │
                              │          └──── (N) Appliance
                              │                      │
                              │                      └──── (N) ApplianceUsageLog
                              │
                              ├──── (N) BillingCycle
                              │
                              └──── (N) MeterReading

TariffSlab (Standalone Configuration Table)
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW OVERVIEW                               │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐     Login/Signup      ┌───────────────┐
    │  USER   │ ───────────────────► │  Supabase     │ ◄── Auth Provider
    └─────────┘                       │  Auth         │
         │                            └───────────────┘
         │                                    │
         │ JWT Token                          │ User ID (UUID)
         ▼                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                        EXPRESS SERVER                            │
    │                                                                  │
    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
    │   │ Auth        │    │ Home        │    │ Appliance   │        │
    │   │ Middleware  │───►│ Routes      │───►│ Routes      │        │
    │   └─────────────┘    └─────────────┘    └─────────────┘        │
    │          │                  │                  │                │
    │          ▼                  ▼                  ▼                │
    │   ┌─────────────────────────────────────────────────┐          │
    │   │            SEQUELIZE ORM                         │          │
    │   └─────────────────────────────────────────────────┘          │
    │                         │                                       │
    └─────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │ ◄── Supabase DB or Local
                    │   Database      │
                    └─────────────────┘
```

---

## Default Tariff Slabs (TNEB 2024)

| Slab | Min Units | Max Units | Rate/Unit | Fixed Charge | Subsidy % |
|------|-----------|-----------|-----------|--------------|-----------|
| 1 | 0 | 100 | ₹2.50 | ₹20 | 50% |
| 2 | 101 | 200 | ₹3.00 | ₹30 | 25% |
| 3 | 201 | 400 | ₹4.50 | ₹50 | 0% |
| 4 | 401 | 500 | ₹6.00 | ₹75 | 0% |
| 5 | 501 | 800 | ₹7.50 | ₹100 | 0% |
| 6 | 801 | ∞ | ₹9.00 | ₹150 | 0% |

---

## Index Recommendations

```sql
-- Performance indexes for common queries
CREATE INDEX idx_homes_user_id ON ps_homes(user_id);
CREATE INDEX idx_rooms_home_id ON ps_rooms(home_id);
CREATE INDEX idx_appliances_room_id ON ps_appliances(room_id);
CREATE INDEX idx_usage_logs_appliance_id ON ps_appliance_usage_logs(appliance_id);
CREATE INDEX idx_usage_logs_created_at ON ps_appliance_usage_logs(created_at);
CREATE INDEX idx_billing_cycles_home_id ON ps_billing_cycles(home_id);
CREATE INDEX idx_meter_readings_home_id ON ps_meter_readings(home_id);
CREATE INDEX idx_tariff_slabs_active ON ps_tariff_slabs(is_active, effective_from);
```

---

*Generated for PowerSense Home v1.0*
