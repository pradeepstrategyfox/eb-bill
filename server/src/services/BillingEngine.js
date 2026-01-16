import TariffSlab from '../models/TariffSlab.js';

/**
 * Calculate TNEB bill based on Tamil Nadu Electricity Board tariff structure
 * @param {number} units - Total units consumed in billing cycle
 * @returns {Object} Bill breakdown with slab-wise calculation
 */
export async function calculateTNEBBill(units) {
    // Get active tariff slabs
    const slabs = await TariffSlab.findAll({
        where: { isActive: true },
        order: [['minUnits', 'ASC']],
    });

    if (slabs.length === 0) {
        throw new Error('No active tariff slabs found');
    }

    let remainingUnits = units;
    let totalCost = 0;
    let totalSubsidy = 0;
    const slabBreakdown = [];

    // Calculate slab-wise cost
    for (const slab of slabs) {
        if (remainingUnits <= 0) break;

        const slabMin = slab.minUnits;
        const slabMax = slab.maxUnits || Infinity;

        // Units applicable for this slab
        const applicableUnits = Math.min(
            remainingUnits,
            units <= slabMax ? remainingUnits : slabMax - slabMin
        );

        if (applicableUnits > 0 && units >= slabMin) {
            const slabCost = applicableUnits * slab.ratePerUnit;
            const slabSubsidy = (slabCost * slab.subsidyPercentage) / 100;
            const netCost = slabCost - slabSubsidy;

            slabBreakdown.push({
                slab: `${slabMin} - ${slabMax === null ? '∞' : slabMax} units`,
                units: applicableUnits,
                rate: slab.ratePerUnit,
                cost: slabCost,
                subsidy: slabSubsidy,
                netCost: netCost,
                fixedCharge: slab.fixedCharge,
            });

            totalCost += netCost;
            totalSubsidy += slabSubsidy;
            remainingUnits -= applicableUnits;
        }
    }

    // Add fixed charges from highest applicable slab
    let fixedCharges = 0;
    for (const slab of slabs) {
        if (units >= slab.minUnits) {
            fixedCharges = Math.max(fixedCharges, slab.fixedCharge);
        }
    }

    const finalBill = totalCost + fixedCharges;

    // Find next slab warning
    let nextSlabWarning = null;
    for (let i = 0; i < slabs.length; i++) {
        if (units < slabs[i].minUnits) {
            nextSlabWarning = {
                unitsToNextSlab: slabs[i].minUnits - units,
                nextSlabRate: slabs[i].ratePerUnit,
                currentRate: i > 0 ? slabs[i - 1].ratePerUnit : slabs[0].ratePerUnit,
            };
            break;
        }
    }

    return {
        totalUnits: units,
        estimatedBill: Math.round(finalBill * 100) / 100,
        slabBreakdown,
        fixedCharges,
        totalSubsidy: Math.round(totalSubsidy * 100) / 100,
        nextSlabWarning,
    };
}

/**
 * Get slab information for a given consumption
 */
export async function getCurrentSlab(units) {
    const slabs = await TariffSlab.findAll({
        where: { isActive: true },
        order: [['minUnits', 'ASC']],
    });

    for (let i = slabs.length - 1; i >= 0; i--) {
        if (units >= slabs[i].minUnits) {
            return slabs[i];
        }
    }

    return slabs[0];
}
