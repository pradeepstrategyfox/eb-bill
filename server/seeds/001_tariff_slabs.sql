-- Seed TNEB Tariff Slabs (Tamil Nadu Electricity Board Domestic Tariff 2024)
-- Bi-monthly billing cycle

INSERT INTO tariff_slabs (min_units, max_units, rate_per_unit, fixed_charge, subsidy_percentage, is_active, effective_from) VALUES
-- Slab 1: 0-100 units (subsidized for low consumption)
(0, 100, 2.50, 20, 50, TRUE, '2024-01-01'),

-- Slab 2: 101-200 units
(101, 200, 3.00, 30, 25, TRUE, '2024-01-01'),

-- Slab 3: 201-400 units
(201, 400, 4.50, 50, 0, TRUE, '2024-01-01'),

-- Slab 4: 401-500 units
(401, 500, 6.00, 75, 0, TRUE, '2024-01-01'),

-- Slab 5: 501-800 units
(501, 800, 7.50, 100, 0, TRUE, '2024-01-01'),

-- Slab 6: 801+ units (highest rate)
(801, NULL, 9.00, 150, 0, TRUE, '2024-01-01');

-- Note: These are approximate rates for demonstration
-- Actual TNEB rates may vary and should be updated based on current tariff structure
