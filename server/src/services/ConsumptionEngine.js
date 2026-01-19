import Appliance from '../models/Appliance.js';
import ApplianceUsageLog from '../models/ApplianceUsageLog.js';
import Room from '../models/Room.js';
import Home from '../models/Home.js';
import BillingCycle from '../models/BillingCycle.js';
import { getRedisClient } from '../config/redis.js';
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
        }
    }

    return appliance;
}

/**
 * Get real-time consumption data for a home
 */
export async function getConsumptionData(homeId) {
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

    const allAppliances = home.rooms.flatMap(room => room.appliances);

    // Calculate live load (appliances currently ON)
    const liveLoadWatts = allAppliances
        .filter(a => a.isOn)
        .reduce((sum, a) => sum + a.wattage, 0);

    //Get active billing cycle
    const activeCycle = await BillingCycle.findOne({
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

        const newCycle = await BillingCycle.create({
            homeId,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalUnits: 0,
            estimatedBill: 0,
            isActive: true,
        });

        return {
            // Frontend expects these exact field names
            liveLoad: Math.round(liveLoadWatts),
            today: 0,
            cycleUsage: 0,
            activeAppliances: allAppliances.filter(a => a.isOn).length,

            // Additional data
            liveLoadWatts: Math.round(liveLoadWatts),
            todayKwh: 0,
            cycleKwh: 0,
            cycleStartDate: newCycle.startDate,
            cycleEndDate: newCycle.endDate,
            daysRemaining: 60,
            topConsumers: [],
        };
    }

    const cycleStart = new Date(activeCycle.startDate);
    const cycleEnd = new Date(activeCycle.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate days remaining
    const daysRemaining = Math.max(0, Math.ceil((cycleEnd - new Date()) / (1000 * 60 * 60 * 24)));

    // Get usage logs for the billing cycle
    const cycleLogs = await ApplianceUsageLog.findAll({
        where: {
            applianceId: {
                [Op.in]: allAppliances.map(a => a.id),
            },
            createdAt: {
                [Op.gte]: cycleStart,
            },
        },
        include: [{
            model: Appliance,
            as: 'appliance',
            include: [{
                model: Room,
                as: 'room',
            }],
        }],
    });

    // Calculate today's consumption
    const todayLogs = cycleLogs.filter(log => {
        const logDate = new Date(log.createdAt);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
    });

    const todayKwh = todayLogs.reduce((sum, log) => sum + log.energyConsumedKwh, 0);

    // Calculate  cycle consumption
    const cycleKwh = cycleLogs.reduce((sum, log) => sum + log.energyConsumedKwh, 0);

    // Calculate top consumers
    const applianceConsumption = {};
    cycleLogs.forEach(log => {
        const appId = log.applianceId;
        if (!applianceConsumption[appId]) {
            applianceConsumption[appId] = {
                applianceName: log.appliance.name,
                roomName: log.appliance.room.name,
                kwh: 0,
            };
        }
        applianceConsumption[appId].kwh += log.energyConsumedKwh;
    });

    const topConsumers = Object.values(applianceConsumption)
        .sort((a, b) => b.kwh - a.kwh)
        .slice(0, 5)
        .map(item => ({
            ...item,
            kwh: Math.round(item.kwh * 100) / 100,
        }));

    // Return data matching frontend Dashboard.jsx expectations
    const activeApplianceCount = allAppliances.filter(a => a.isOn).length;

    return {
        // Frontend expects these exact field names
        liveLoad: Math.round(liveLoadWatts), // Watts
        today: Math.round(todayKwh * 100) / 100, // kWh
        cycleUsage: Math.round(cycleKwh * 100) / 100, // kWh
        activeAppliances: activeApplianceCount,

        // Additional data for other pages
        liveLoadWatts: Math.round(liveLoadWatts),
        todayKwh: Math.round(todayKwh * 100) / 100,
        cycleKwh: Math.round(cycleKwh * 100) / 100,
        cycleStartDate: activeCycle.startDate,
        cycleEndDate: activeCycle.endDate,
        daysRemaining,
        topConsumers,
    };
}

/**
 * Calculate cost for top consumers
 */
export async function getTopConsumersWithCost(homeId, avgRate = 5) {
    const consumptionData = await getConsumptionData(homeId);

    return consumptionData.topConsumers.map(item => ({
        ...item,
        cost: Math.round(item.kwh * avgRate * 100) / 100,
    }));
}
