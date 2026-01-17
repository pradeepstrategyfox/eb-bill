// Appliance library with default wattage values
export const APPLIANCE_LIBRARY = {
    // Lighting
    'LED Bulb': { wattage: 9, category: 'lighting' },
    'CFL Bulb': { wattage: 15, category: 'lighting' },
    'Tube Light': { wattage: 40, category: 'lighting' },
    'Incandescent Bulb': { wattage: 60, category: 'lighting' },

    // Cooling
    'Normal Fan': { wattage: 75, category: 'cooling' },
    'BLDC Fan': { wattage: 35, category: 'cooling' },
    'Table Fan': { wattage: 50, category: 'cooling' },
    '1 Ton 3 Star AC': { wattage: 1200, category: 'cooling' },
    '1 Ton 5 Star AC': { wattage: 900, category: 'cooling' },
    '1.5 Ton 3 Star AC': { wattage: 1700, category: 'cooling' },
    '1.5 Ton 5 Star AC': { wattage: 1500, category: 'cooling' },
    '2 Ton 3 Star AC': { wattage: 2200, category: 'cooling' },
    '2 Ton 5 Star AC': { wattage: 2000, category: 'cooling' },

    // Heating
    'Geyser 15L': { wattage: 2000, category: 'heating' },
    'Geyser 25L': { wattage: 2500, category: 'heating' },
    'Room Heater': { wattage: 2000, category: 'heating' },
    'Iron Box': { wattage: 1000, category: 'heating' },

    // Kitchen
    'Refrigerator Single Door': { wattage: 150, category: 'kitchen' },
    'Refrigerator Double Door': { wattage: 250, category: 'kitchen' },
    'Induction Cooktop': { wattage: 1500, category: 'kitchen' },
    'Microwave Oven': { wattage: 1200, category: 'kitchen' },
    'Mixer Grinder': { wattage: 500, category: 'kitchen' },
    'Electric Kettle': { wattage: 1500, category: 'kitchen' },
    'Toaster': { wattage: 800, category: 'kitchen' },
    'Rice Cooker': { wattage: 700, category: 'kitchen' },
    'Dishwasher': { wattage: 1800, category: 'kitchen' },

    // Electronics
    'LED TV 32 inch': { wattage: 50, category: 'electronics' },
    'LED TV 43 inch': { wattage: 80, category: 'electronics' },
    'LED TV 55 inch': { wattage: 110, category: 'electronics' },
    'Desktop Computer': { wattage: 150, category: 'electronics' },
    'Laptop': { wattage: 65, category: 'electronics' },
    'Monitor': { wattage: 40, category: 'electronics' },
    'Printer': { wattage: 50, category: 'electronics' },
    'WiFi Router': { wattage: 10, category: 'electronics' },
    'Set Top Box': { wattage: 15, category: 'electronics' },
    'Gaming Console': { wattage: 150, category: 'electronics' },

    // Charging
    'Mobile Charger': { wattage: 18, category: 'electronics' },
    'Tablet Charger': { wattage: 24, category: 'electronics' },
    'Laptop Charger': { wattage: 65, category: 'electronics' },

    // Other
    'Washing Machine': { wattage: 500, category: 'other' },
    'Vacuum Cleaner': { wattage: 1000, category: 'other' },
    'Air Purifier': { wattage: 50, category: 'other' },
    'Water Pump': { wattage: 750, category: 'other' },
};

export function getApplianceWattage(type) {
    return APPLIANCE_LIBRARY[type]?.wattage || 100; // Default 100W if not found
}

export function getApplianceCategory(type) {
    return APPLIANCE_LIBRARY[type]?.category || 'other';
}

export function getAllAppliances() {
    return Object.keys(APPLIANCE_LIBRARY).map(type => ({
        type,
        ...APPLIANCE_LIBRARY[type],
    }));
}

export function getAppliancesByCategory(category) {
    return Object.keys(APPLIANCE_LIBRARY)
        .filter(type => APPLIANCE_LIBRARY[type].category === category)
        .map(type => ({
            type,
            ...APPLIANCE_LIBRARY[type],
        }));
}

