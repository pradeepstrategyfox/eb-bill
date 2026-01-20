import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';
import { HiInformationCircle, HiBolt } from 'react-icons/hi2';

export default function BillExplanation() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [billing, setBilling] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBilling = async () => {
            try {
                const { data: homesData, error: homesError } = await supabase
                    .from('ps_homes')
                    .select('*, ps_rooms(*, ps_appliances(*))')
                    .order('created_at');
                
                if (homesError) throw homesError;
                setHomes(homesData);

                if (homesData && homesData.length > 0) {
                    const homeId = homesData[0].id;
                    setSelectedHome(homesData[0]);
                    
                    // Sync billing before fetching
                    await supabase.rpc('sync_billing_estimate', { home_id_param: homeId });

                    const { data: billData, error: billError } = await supabase
                        .from('ps_billing_cycles')
                        .select('*')
                        .eq('home_id', homeId)
                        .eq('is_active', true)
                        .maybeSingle();

                    if (billError) throw billError;
                    
                    // 1. Fetch tariff slabs to calculate breakdown
                    let { data: slabs } = await supabase
                        .from('ps_tariff_slabs')
                        .select('*')
                        .eq('is_active', true)
                        .order('min_units', { ascending: true });

                    // Fallback slabs if DB is empty
                    if (!slabs || slabs.length === 0) {
                        slabs = [
                            { min_units: 0, max_units: 100, rate_per_unit: 0, fixed_charge: 0, subsidy_percentage: 100 },
                            { min_units: 101, max_units: 200, rate_per_unit: 2.25, fixed_charge: 20, subsidy_percentage: 0 },
                            { min_units: 201, max_units: 400, rate_per_unit: 4.50, fixed_charge: 30, subsidy_percentage: 0 },
                            { min_units: 401, max_units: null, rate_per_unit: 6.00, fixed_charge: 50, subsidy_percentage: 0 }
                        ];
                    }

                    // 2. Calculate TOTAL units including active sessions
                    const now = new Date();
                    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    const startDate = billData?.start_date || thirtyDaysAgo.toISOString();
                    const home = homesData[0];

                    // Get all appliance IDs for this home
                    const applianceIds = home.ps_rooms?.flatMap(r => r.ps_appliances?.map(a => a.id) || []) || [];

                    const { data: allLogs } = await supabase
                        .from('ps_appliance_usage_logs')
                        .select('appliance_id, energy_consumed_kwh, turned_on_at, turned_off_at')
                        .gte('turned_on_at', startDate)
                        .in('appliance_id', applianceIds);

                    let totalUnits = 0;
                    if (allLogs && allLogs.length > 0) {
                        allLogs.forEach(log => {
                            let logEnergy = log.energy_consumed_kwh || 0;
                            if (!log.turned_off_at) {
                                const app = home.ps_rooms?.flatMap(r => r.ps_appliances || []).find(a => a.id === log.appliance_id);
                                if (app) {
                                    const durationHrs = (now - new Date(log.turned_on_at)) / (1000 * 60 * 60);
                                    logEnergy = (app.wattage / 1000) * durationHrs;
                                }
                            }
                            totalUnits += logEnergy;
                        });
                    }

                    let remainingUnits = totalUnits;
                    let breakdown = [];
                    let fixedCharges = 0;

                    slabs.forEach(slab => {
                        if (remainingUnits <= 0) return;

                        let unitsInSlab;
                        if (!slab.max_units) {
                            unitsInSlab = remainingUnits;
                        } else {
                            unitsInSlab = Math.min(remainingUnits, slab.max_units - slab.min_units + 1);
                        }

                        const cost = unitsInSlab * slab.rate_per_unit;
                        const subsidy = cost * (slab.subsidy_percentage / 100);
                        const netCost = cost - subsidy;

                        breakdown.push({
                            slab: `${slab.min_units}${slab.max_units ? ` - ${slab.max_units}` : '+'} Units`,
                            units: unitsInSlab.toFixed(1),
                            rate: slab.rate_per_unit,
                            cost: cost,
                            subsidy: subsidy,
                            netCost: netCost
                        });

                        fixedCharges = Math.max(fixedCharges, slab.fixed_charge || 0);
                        remainingUnits -= unitsInSlab;
                    });

                    const calculatedBill = breakdown.reduce((sum, item) => sum + item.netCost, 0) + fixedCharges;

                    setBilling({
                        totalBill: billData?.estimated_bill || calculatedBill,
                        totalUnits: totalUnits,
                        totalSubsidy: breakdown.reduce((sum, item) => sum + item.subsidy, 0),
                        fixedCharges: fixedCharges,
                        slab: totalUnits > 0 ? breakdown[breakdown.length - 1]?.slab : 'Standard Rate',
                        slabBreakdown: breakdown
                    });
                }
            } catch (error) {
                console.error('Error fetching billing data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBilling();
    }, []);

    if (loading) return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="dashboard-header">
                <h1>Bill Explanation</h1>
                <p className="subtitle">Detailed breakdown of your electricity charges</p>
            </div>

            <div className="bill-card glass">
                <div className="bill-total">
                    <p>Estimated Total</p>
                    <h2>₹{billing?.totalBill?.toFixed(0) || 0}</h2>
                    <span className="badge">{billing?.slab || 'Standard Slab'}</span>
                </div>
                
                <div className="bill-details">
                    <div className="bill-row">
                        <span>Current Usage</span>
                        <span>{billing?.totalUnits?.toFixed(1) || 0} Units</span>
                    </div>
                    <div className="bill-row">
                        <span>Billing Range</span>
                        <span>{billing?.slab || 'Standard Slab'}</span>
                    </div>
                    <div className="bill-row">
                        <span>Subtotal</span>
                        <span>₹{((billing?.totalBill || 0) + (billing?.totalSubsidy || 0) - (billing?.fixedCharges || 0)).toFixed(2)}</span>
                    </div>
                    {billing?.totalSubsidy > 0 && (
                        <div className="bill-row" style={{ color: '#22c55e' }}>
                            <span>Total Subsidy</span>
                            <span>- ₹{billing.totalSubsidy.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="bill-row">
                        <span>Fixed Charges</span>
                        <span>₹{billing?.fixedCharges || 0}</span>
                    </div>
                    <div className="divider" style={{ margin: '12px 0' }}></div>
                    <div className="bill-row total">
                        <span>Net Payable</span>
                        <span>₹{billing?.totalBill?.toFixed(0) || 0}</span>
                    </div>
                </div>
            </div>

            <div className="section mb-32">
                <h2 className="mb-24">Slab Breakdown (TNEB)</h2>
                <div className="history-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Unit Slab</th>
                                <th>Units</th>
                                <th>Rate</th>
                                <th>Cost</th>
                                <th>Subsidy</th>
                                <th>Net Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {billing?.slabBreakdown?.length > 0 ? (
                                billing.slabBreakdown.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.slab}</td>
                                        <td>{row.units}</td>
                                        <td>₹{row.rate}</td>
                                        <td>₹{row.cost?.toFixed(2)}</td>
                                        <td style={{ color: row.subsidy > 0 ? '#22c55e' : 'inherit' }}>
                                            {row.subsidy > 0 ? `-₹${row.subsidy.toFixed(2)}` : '₹0.00'}
                                        </td>
                                        <td>₹{row.netCost?.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center' }}>No slab data available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="warning-box mb-32">
                <div className="warning-icon"><HiInformationCircle /></div>
                <div className="warning-content">
                    <h3>Smart Savings Tip</h3>
                    <p>Reducing your usage by just 12 units could move you to a lower price slab. Based on your current patterns, this would save you approximately <strong>₹185</strong> on your next bi-monthly bill.</p>
                </div>
            </div>

            <div className="section">
                <h2 className="mb-24">Billing Information</h2>
                <div className="info-grid">
                    <div className="info-card">
                        <h3><HiBolt style={{ color: '#fbbf24', marginRight: '8px' }} /> Tiered Pricing</h3>
                        <p>TNEB uses slab-based pricing. Higher consumption moves you into tiers with higher rates per unit.</p>
                    </div>
                    <div className="info-card">
                        <h3><HiBolt style={{ color: '#fbbf24', marginRight: '8px' }} /> Subsidies</h3>
                        <p>All domestic users receive the first 100 units free. Low-consumption users get additional subsidies.</p>
                    </div>
                    <div className="info-card">
                        <h3><HiBolt style={{ color: '#fbbf24', marginRight: '8px' }} /> Billing Cycle</h3>
                        <p>Bills are calculated bi-monthly. Our estimates reflect this 60-day cycle for accuracy.</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
