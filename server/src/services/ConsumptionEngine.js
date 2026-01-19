import Appliance from '../models/Appliance.js';
import ApplianceUsageLog from '../models/ApplianceUsageLog.js';
import Room from '../models/Room.js';
import Home from '../models/Home.js';
import BillingCycle from '../models/BillingCycle.js';
import MeterReading from '../models/MeterReading.js';
// Redis disabled - using REST alone
// import { getRedisClient } from '../config/redis.js';
import { Op } from 'sequelize';

const CONSUMPTION_PREFIX = 'consumption:';

/**
 * Toggle appliance state and log usage
 */
export async function toggleAppliance(applianceId, isOn) {
    const appliance = await Appliance.findByPk(applianceId);
    if (!appliance) {
        throw new Error('Appliance not found');
    }

    const now = new Date();

    // If turning ON
    if (isOn) {
        appliance.isOn = true;
        await appliance.save();

        // Create usage log with turnedOnAt timestamp
        await ApplianceUsageLog.create({
            applianceId: appliance.id,
            turnedOnAt: now,
            durationSeconds: 0,
            energyConsumedKwh: 0,
        });

        console.log(`✅ Appliance ${appliance.name} turned ON at ${now.toISOString()}`);
    }
    // If turning OFF
    else {
        appliance.isOn = false;
        await appliance.save();

        // Find the last open usage log
        const usageLog = await ApplianceUsageLog.findOne({
            where: {
                applianceId: appliance.id,
                turnedOffAt: null,
            },
            order: [['createdAt', 'DESC']],
        });

        if (usageLog) {
            const turnedOnAt = new Date(usageLog.turnedOnAt);
            const durationSeconds = Math.floor((now - turnedOnAt) / 1000);
            const durationHours = durationSeconds / 3600;
            const energyConsumedKwh = (appliance.wattage / 1000) * durationHours;

            usageLog.turnedOffAt = now;
            usageLog.durationSeconds = durationSeconds;
            usageLog.energyConsumedKwh = energyConsumedKwh;
            await usageLog.save();

            console.log(`✅ Appliance ${appliance.name} turned OFF. Duration: ${durationHours.toFixed(2)}h, Energy: ${energyConsumedKwh.toFixed(4)} kWh`);
        }
    }

    return appliance;
}

/**
 * Get the last (most recent) meter reading for a home
 */
export async function getLastMeterReading(homeId) {
    const lastReading = await MeterReading.findOne({
        where: { homeId },
        order: [['readingDate', 'DESC']],
    });

    console.log(`📊 Last meter reading for home ${homeId}:`, lastReading ? `${lastReading.readingValue} kWh at ${lastReading.readingDate}` : 'None');
    return lastReading;
}

/**
 * Calculate accumulated consumption since last meter reading
 */
export async function calculateAccumulatedConsumption(homeId, sinceDate = null) {
    // Get all appliances for this home
    const home = await Home.findByPk(homeId, {
        include: [{
            model: Room,
            as: 'rooms',
            include: [{
                model: Appliance,
                as: 'appliances',
            }],
        }],
    });

    if (!home) {
        throw new Error('Home not found');
    }

    const allAppliances = home.rooms.flatMap(room => room.appliances);
    const applianceIds = allAppliances.map(a => a.id);

    if (applianceIds.length === 0) {
        return {
            completedKwh: 0,
            activeKwh: 0,
            totalKwh: 0,
            details: [],
        };
    }

    // If no sinceDate provided, use last meter reading or billing cycle start
    let startDate = sinceDate;
    if (!startDate) {
        const lastReading = await getLastMeterReading(homeId);
        if (lastReading) {
            startDate = lastReading.readingDate;
        } else {
            // Fallback to billing cycle start
            const activeCycle = await BillingCycle.findOne({
                where: { homeId, isActive: true },
            });
            startDate = activeCycle ? new Date(activeCycle.startDate) : new Date();
        }
    }

    const now = new Date();
    console.log(`⚡ Calculating consumption from ${startDate} to ${now}`);

    // 1. Get all COMPLETED usage logs since startDate
    const completedLogs = await ApplianceUsageLog.findAll({
        where: {
            applianceId: { [Op.in]: applianceIds },
            turnedOffAt: { [Op.not]: null },
            turnedOnAt: { [Op.gte]: startDate },
        },
    });

    const completedKwh = completedLogs.reduce((sum, log) => sum + (log.energyConsumedKwh || 0), 0);
    console.log(`   Completed logs: ${completedLogs.length}, Total: ${completedKwh.toFixed(4)} kWh`);

    // 2. Calculate consumption from CURRENTLY ACTIVE appliances
    const activeAppliances = allAppliances.filter(a => a.isOn);
    let activeKwh = 0;
    const activeDetails = [];

    for (const appliance of activeAppliances) {
        // Find the most recent open log for this appliance
        const activeLog = await ApplianceUsageLog.findOne({
            where: {
                applianceId: appliance.id,
                turnedOffAt: null,
            },
            order: [['turnedOnAt', 'DESC']],
        });

        if (activeLog) {
            const turnedOnAt = new Date(activeLog.turnedOnAt);
            // Only count if turned on after startDate
            const effectiveStart = turnedOnAt > startDate ? turnedOnAt : startDate;
            const durationSeconds = Math.floor((now - effectiveStart) / 1000);
            const durationHours = durationSeconds / 3600;
            const energyKwh = (appliance.wattage / 1000) * durationHours;

            activeKwh += energyKwh;
            activeDetails.push({
                applianceName: appliance.name,
                wattage: appliance.wattage,
                turnedOnAt: turnedOnAt.toISOString(),
                durationHours: durationHours.toFixed(2),
                energyKwh: energyKwh.toFixed(4),
            });

            console.log(`   Active: ${appliance.name} (${appliance.wattage}W) - ${durationHours.toFixed(2)}h = ${energyKwh.toFixed(4)} kWh`);
        }
    }

    const totalKwh = completedKwh + activeKwh;
    console.log(`   TOTAL: ${totalKwh.toFixed(4)} kWh (Completed: ${completedKwh.toFixed(4)}, Active: ${activeKwh.toFixed(4)})`);

    return {
        completedKwh: Math.round(completedKwh * 10000) / 10000,
        activeKwh: Math.round(activeKwh * 10000) / 10000,
        totalKwh: Math.round(totalKwh * 10000) / 10000,
        startDate: startDate,
        endDate: now,
        activeAppliances: activeDetails,
    };
}

/**
 * Get comprehensive consumption data for a home
 * This is the MAIN function called by the API
 */
export async function getConsumptionData(homeId) {
    console.log(`\n========== Getting Consumption Data for Home ${homeId} ==========`);

    // Get all appliances for the home
    const home = await Home.findByPk(homeId, {
        include: [{
            model: Room,
            as: 'rooms',
            include: [{
                model: Appliance,
                as: 'appliances',
            }],
        }],
    });

    if (!home) {
        throw new Error('Home not found');
    }

    console.log(`🏠 Found home: ${home.name} with ${home.rooms?.length || 0} rooms`);
    
    const allAppliances = home.rooms?.flatMap(room => {
        console.log(`   📍 Room: ${room.name} has ${room.appliances?.length || 0} appliances`);
        return room.appliances || [];
    }) || [];

    console.log(`🔌 Total appliances found: ${allAppliances.length}`);

    // Calculate live load (appliances currently ON)
    const liveLoadWatts = allAppliances
        .filter(a => a.isOn)
        .reduce((sum, a) => sum + a.wattage, 0);

    const activeApplianceCount = allAppliances.filter(a => a.isOn).length;

    console.log(`🔌 Live Load: ${liveLoadWatts}W from ${activeApplianceCount} appliances`);

    // Get or create active billing cycle
    let activeCycle = await BillingCycle.findOne({
        where: {
            homeId,
            isActive: true,
        },
    });

    if (!activeCycle) {
        // Create a new billing cycle if none exists
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 60); // 60 days bi-monthly cycle

        activeCycle = await BillingCycle.create({
            homeId,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalUnits: 0,
            estimatedBill: 0,
            isActive: true,
        });

        console.log(`✅ Created new billing cycle: ${activeCycle.startDate} to ${activeCycle.endDate}`);
    }

    // Get last meter reading
    const lastMeterReading = await getLastMeterReading(homeId);

    // Calculate accumulated consumption since last meter reading
    const accumulated = await calculateAccumulatedConsumption(homeId);

    // Calculate current estimated meter reading
    const lastReadingValue = lastMeterReading ? lastMeterReading.readingValue : 0;
    const currentEstimatedReading = lastReadingValue + accumulated.totalKwh;

    // Calculate today's consumption (since midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayConsumption = await calculateAccumulatedConsumption(homeId, todayStart);

    // Calculate cycle consumption (since billing cycle start)
    const cycleStart = new Date(activeCycle.startDate);
    const cycleConsumption = await calculateAccumulatedConsumption(homeId, cycleStart);

    const cycleEndDate = new Date(activeCycle.endDate);
    const daysRemaining = Math.ceil((cycleEndDate - new Date()) / (1000 * 60 * 60 * 24));

    console.log(`📊 Summary:`);
    console.log(`   Last Meter Reading: ${lastReadingValue} kWh at ${lastMeterReading?.readingDate || 'N/A'}`);
    console.log(`   Accumulated Since: ${accumulated.totalKwh.toFixed(4)} kWh`);
    console.log(`   Current Estimated: ${currentEstimatedReading.toFixed(4)} kWh`);
    console.log(`   Today: ${todayConsumption.totalKwh.toFixed(4)} kWh`);
    console.log(`   This Cycle: ${cycleConsumption.totalKwh.toFixed(4)} kWh`);
    console.log(`========================================================\n`);

    // Prepare rooms and appliances for the frontend
    const roomsData = home.rooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        appliances: room.appliances.map(app => ({
            id: app.id,
            name: app.name,
            type: app.type,
            powerRating: app.wattage,
            status: app.isOn
        }))
    }));

    // Return comprehensive data
    return {
        // Frontend-expected field names
        liveLoad: Math.round(liveLoadWatts),
        today: Math.round(todayConsumption.totalKwh * 100) / 100,
        cycleUsage: Math.round(cycleConsumption.totalKwh * 100) / 100,
        activeAppliances: activeApplianceCount,
        rooms: roomsData,

        // New fields for current meter reading
        lastMeterReading: lastMeterReading ? {
            value: lastMeterReading.readingValue,
            date: lastMeterReading.readingDate,
            variance: lastMeterReading.variancePercentage,
        } : null,
        currentEstimatedReading: Math.round(currentEstimatedReading * 100) / 100,
        accumulatedSinceLastReading: Math.round(accumulated.totalKwh * 100) / 100,

        // Additional data
        liveLoadWatts: Math.round(liveLoadWatts),
        todayKwh: Math.round(todayConsumption.totalKwh * 100) / 100,
        cycleKwh: Math.round(cycleConsumption.totalKwh * 100) / 100,
        cycleStartDate: activeCycle.startDate,
        cycleEndDate: activeCycle.endDate,
        daysRemaining: daysRemaining,

        // Active appliance details
        activeApplianceDetails: accumulated.activeAppliances,

        // Top consumers (based on cycle consumption)
        topConsumers: [], // TODO: Implement if needed
    };
}

/**
 * Get top energy consumers with cost breakdown
 * Used by the insights endpoint
 */
export async function getTopConsumersWithCost(homeId) {
    console.log(`\n========== Getting Top Consumers for Home ${homeId} ==========`);

    // Get all appliances for the home
    const home = await Home.findByPk(homeId, {
        include: [{
            model: Room,
            as: 'rooms',
            include: [{
                model: Appliance,
                as: 'appliances',
            }],
        }],
    });

    if (!home) {
        throw new Error('Home not found');
    }

    const allAppliances = home.rooms.flatMap(room => 
        room.appliances.map(appliance => ({
            ...appliance.toJSON(),
            roomName: room.name,
        }))
    );

    if (allAppliances.length === 0) {
        return [];
    }

    const applianceIds = allAppliances.map(a => a.id);

    // Get billing cycle start date
    const activeCycle = await BillingCycle.findOne({
        where: { homeId, isActive: true },
    });

    const cycleStart = activeCycle ? new Date(activeCycle.startDate) : new Date();
    const now = new Date();

    // Get all completed usage logs for this billing cycle
    const usageLogs = await ApplianceUsageLog.findAll({
        where: {
            applianceId: { [Op.in]: applianceIds },
            turnedOffAt: { [Op.not]: null },
            turnedOnAt: { [Op.gte]: cycleStart },
        },
    });

    // Calculate consumption per appliance
    const consumptionMap = new Map();

    // Initialize with all appliances
    for (const appliance of allAppliances) {
        consumptionMap.set(appliance.id, {
            id: appliance.id,
            name: appliance.name,
            roomName: appliance.roomName,
            wattage: appliance.wattage,
            totalKwh: 0,
            totalSeconds: 0,
            isOn: appliance.isOn,
        });
    }

    // Sum up completed usage logs
    for (const log of usageLogs) {
        const entry = consumptionMap.get(log.applianceId);
        if (entry) {
            entry.totalKwh += log.energyConsumedKwh || 0;
            entry.totalSeconds += log.durationSeconds || 0;
        }
    }

    // Add current active usage for appliances that are ON
    for (const appliance of allAppliances) {
        if (appliance.isOn) {
            const activeLog = await ApplianceUsageLog.findOne({
                where: {
                    applianceId: appliance.id,
                    turnedOffAt: null,
                },
                order: [['turnedOnAt', 'DESC']],
            });

            if (activeLog) {
                const turnedOnAt = new Date(activeLog.turnedOnAt);
                const effectiveStart = turnedOnAt > cycleStart ? turnedOnAt : cycleStart;
                const durationSeconds = Math.floor((now - effectiveStart) / 1000);
                const energyKwh = (appliance.wattage / 1000) * (durationSeconds / 3600);

                const entry = consumptionMap.get(appliance.id);
                if (entry) {
                    entry.totalKwh += energyKwh;
                    entry.totalSeconds += durationSeconds;
                }
            }
        }
    }

    // Convert to array and sort by consumption
    const consumers = Array.from(consumptionMap.values())
        .filter(c => c.totalKwh > 0 || c.isOn)
        .sort((a, b) => b.totalKwh - a.totalKwh)
        .slice(0, 10); // Top 10 consumers

    // Calculate cost for each (using simple rate of ₹5/kWh as default)
    const costPerKwh = 5; // TODO: Get from tariff slabs
    const totalKwh = consumers.reduce((sum, c) => sum + c.totalKwh, 0);

    const result = consumers.map(c => ({
        id: c.id,
        name: c.name,
        roomName: c.roomName,
        wattage: c.wattage,
        isOn: c.isOn,
        totalKwh: Math.round(c.totalKwh * 1000) / 1000,
        totalHours: Math.round(c.totalSeconds / 36) / 100, // Convert to hours with 2 decimal places
        estimatedCost: Math.round(c.totalKwh * costPerKwh * 100) / 100,
        percentage: totalKwh > 0 ? Math.round((c.totalKwh / totalKwh) * 100) : 0,
    }));

    console.log(`📊 Found ${result.length} top consumers`);
    console.log(`========================================================\n`);

    return result;
}

export default {
    toggleAppliance,
    getLastMeterReading,
    calculateAccumulatedConsumption,
    getConsumptionData,
    getTopConsumersWithCost,
};
