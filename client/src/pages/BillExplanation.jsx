import { useState, useEffect } from 'react';
import { DashboardLayout } from './Dashboard';
import api from '../api';

export default function BillExplanation() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [billing, setBilling] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const homesRes = await api.get('/api/homes');
            setHomes(homesRes.data);

            if (homesRes.data.length > 0) {
                const home = homesRes.data[0];
                setSelectedHome(home);

                const billRes = await api.get(`/api/homes/${home.id}/billing/current`);
                setBilling(billRes.data);
            }
        } catch (error) {
            console.error('Error fetching billing:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ width: '48px', height: '48px', margin: '0 auto' }}></div>
                </div>
            </DashboardLayout>
        );
    }

    if (homes.length === 0 || !billing) {
        return (
            <DashboardLayout>
                <div className="empty-state">
                    <h2>No Data Available</h2>
                    <p>Set up your home and start tracking to see bill breakdown</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <h1>Bill Explanation</h1>

            <div className="section">
                <div className="bill-summary">
                    <div className="bill-amount">
                        <h2>Estimated Bill</h2>
                        <div className="amount">₹{billing.totalBill?.toFixed(2) || 0}</div>
                        <div className="units">{billing.totalUnits?.toFixed(2) || 0} kWh</div>
                    </div>
                </div>
            </div>

            <div className="section">
                <h2>Slab-wise Breakdown</h2>
                <div className="breakdown-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Slab</th>
                                <th>Units</th>
                                <th>Rate (₹/kWh)</th>
                                <th>Subtotal</th>
                                <th>Subsidy</th>
                                <th>Final Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {billing.breakdown?.map((slab, index) => (
                                <tr key={index}>
                                    <td>{slab.slabRange}</td>
                                    <td>{slab.unitsConsumed?.toFixed(2)}</td>
                                    <td>₹{slab.ratePerUnit?.toFixed(2)}</td>
                                    <td>₹{slab.subtotal?.toFixed(2)}</td>
                                    <td>₹{slab.subsidy?.toFixed(2)}</td>
                                    <td>₹{slab.finalCost?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="5"><strong>Fixed Charges</strong></td>
                                <td><strong>₹{billing.fixedCharges?.toFixed(2)}</strong></td>
                            </tr>
                            <tr className="total-row">
                                <td colSpan="5"><strong>Total Bill</strong></td>
                                <td><strong>₹{billing.totalBill?.toFixed(2)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {billing.nextSlabWarning && (
                <div className="section">
                    <div className="warning-box">
                        <div className="warning-icon">⚠️</div>
                        <div>
                            <h3>Approaching Next Slab</h3>
                            <p>{billing.nextSlabWarning}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="section">
                <h2>Understanding TNEB Billing</h2>
                <div className="info-grid">
                    <div className="info-card">
                        <h3>Tiered Pricing</h3>
                        <p>TNEB uses slab-based pricing. Higher consumption = higher rates per unit</p>
                    </div>
                    <div className="info-card">
                        <h3>Subsidies</h3>
                        <p>Low-consumption users (0-200 units) get government subsidies</p>
                    </div>
                    <div className="info-card">
                        <h3>Billing Cycle</h3>
                        <p>Bills are calculated bi-monthly (every 60 days)</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
