import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api';
import { HiInformationCircle, HiBolt } from 'react-icons/hi2';

export default function BillExplanation() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [billing, setBilling] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBilling = async () => {
            try {
                const homesRes = await api.get('/api/homes');
                setHomes(homesRes.data);
                if (homesRes.data.length > 0) {
                    const homeId = homesRes.data[0].id;
                    setSelectedHome(homesRes.data[0]);
                    const billRes = await api.get(`/api/billing/${homeId}/current`);
                    setBilling(billRes.data);
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
                        <span>Rate per Unit</span>
                        <span>₹{billing?.ratePerUnit || 0}</span>
                    </div>
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
                                <th>Rate/Unit</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>0 - 100 Units</td>
                                <td>₹0.00</td>
                                <td style={{ color: '#22c55e', fontWeight: 600 }}>Subsidized</td>
                            </tr>
                            <tr>
                                <td>101 - 200 Units</td>
                                <td>₹2.25</td>
                                <td>Standard</td>
                            </tr>
                            <tr>
                                <td>201+ Units</td>
                                <td>₹4.50</td>
                                <td>Higher Tier</td>
                            </tr>
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
