# Supabase Migration Verification Checklist

This document provides a set of checks to ensure the frontend has been successfully converted to Supabase and everything is functioning correctly.

## 1. Authentication
- [ ] **Login**: Can you log in with an existing Supabase user?
- [ ] **Signup**: Does creating a new account work and redirect to the Setup Wizard?
- [ ] **Auth State**: If you refresh the page while logged in, do you stay logged in (no flash of login screen)?
- [ ] **Logout**: Find the logout button (usually in DashboardLayout) and verify it clears the session and redirects to login.

## 2. Setup Wizard
- [ ] **Step 1**: Can you set the home name and room count?
- [ ] **Step 2**: Can you name rooms and select types?
- [ ] **Step 3**: 
    - [ ] Adding from library: Does selecting a library appliance add it to the room?
    - [ ] Custom Appliances: Can you add a custom appliance with name and wattage?
- [ ] **Finish**: 
    - [ ] Does clicking "Finish" save the data and redirect to the Dashboard?
    - [ ] Check the Supabase **Table Editor**:
        - [ ] `ps_homes`: Is there a row with your home name and `user_id`?
        - [ ] `ps_rooms`: Are the rooms correctly linked to the home via `home_id`?
        - [ ] `ps_appliances`: Are the appliances correctly linked to the rooms via `room_id`?

## 3. Dashboard
- [ ] **Live Load**: Does the live load sum match the wattage of appliances that are "ON"?
- [ ] **Toggling**:
    - [ ] Can you toggle an appliance ON/OFF?
    - [ ] Verify in Supabase `ps_appliances` table: Does `is_on` change?
    - [ ] Verify in Supabase `ps_appliance_usage_logs`: Is a new log created when turned ON? Is it closed (with `energy_consumed_kwh` calculated) when turned OFF?
- [ ] **Real-time**: If you open the dashboard in two tabs, does toggling an appliance in one tab update the status in the other tab instantly?

## 4. Meter Readings
- [ ] **Submission**: Can you submit a new meter value?
- [ ] **History**: Does the history table show your new reading immediately?
- [ ] **Database Check**: Verify the `ps_meter_readings` table contains the new entry.

## 5. Insights
- [ ] **Top Consumers**: After toggling some appliances ON and then OFF, do they appear in the "Top Power Consumers" list? (Note: Consumption is logged when the appliance is turned OFF).

## 6. Bill Explanation
- [ ] **Estimates**: Does the "Estimated Total" show a value based on `ps_billing_cycles`?
- [ ] **Usage**: Does the "Current Usage" match the `total_units` in your active billing cycle?

## Common Troubleshooting (Developer console)
- If data is not loading, check for:
    - **403 Forbidden**: RLS policies might be missing or incorrect.
    - **404 Not Found**: Table names might be misspelled (verify `ps_` prefix).
    - **TypeError**: Check if you are using string UUIDs where the code might expect integers (avoid `parseInt` on IDs).
