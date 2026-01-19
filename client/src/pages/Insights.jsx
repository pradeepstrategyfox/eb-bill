import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api';
import { 
    HiChevronDoubleUp, 
    HiLightBulb, 
    HiClock,
    HiArrowTrendingUp
} from 'react-icons/hi2';
import { IoSnow } from 'react-icons/io5';

export default function Insights() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const homesRes = await api.get('/api/homes');
                setHomes(homesRes.data);
                if (homesRes.data.length > 0) {
                    const homeId = homesRes.data[0].id;
                    setSelectedHome(homesRes.data[0]);
                    const insightsRes = await api.get(`/api/consumption/${homeId}/insights`);
                    setInsights(insightsRes.data);
                }
            } catch (error) {
                console.error('Error fetching insights:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    if (loading) return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="dashboard-header">
                <h1>Smart Insights</h1>
                <p className="subtitle">Data-driven recommendations to reduce your bill</p>
            </div>

            <div className="section mb-24">
                <h2 className="mb-24">Top Power Consumers</h2>
                <div className="top-consumers">
                    {insights?.topConsumers?.length > 0 ? (
                        insights.topConsumers.map((item, index) => (
                            <div key={item.id || index} className="consumer-card">
                                <div className="consumer-rank">#{index + 1}</div>
                                <div className="consumer-info">
                                    <p className="consumer-name">{item.name}</p>
                                    <p className="consumer-room">{item.roomName || 'Unknown Room'}</p>
                                </div>
                                <div className="consumer-stats">
                                    <p className="consumer-energy">{item.totalKwh?.toFixed(2) || '0.00'} kWh/mo</p>
                                    <p className="consumer-cost">₹{item.estimatedCost?.toFixed(0) || '0'} approx.</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state-mini">
                            <HiChevronDoubleUp />
                            <p>No usage data available yet. Turn on some appliances to start tracking.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="section">
                <h2>AI Recommendations</h2>
                <div className="recommendations-grid">
                    <div className="recommendation-card">
                        <div className="rec-icon"><HiLightBulb style={{ color: '#fbbf24' }} /></div>
                        <h3>Energy Efficient Lighting</h3>
                        <p>Replace incandescent bulbs with LED to save up to 85% energy</p>
                    </div>
                    <div className="recommendation-card">
                        <div className="rec-icon"><IoSnow style={{ color: '#0ea5e9' }} /></div>
                        <h3>AC Temperature</h3>
                        <p>Set AC to 24-25°C for optimal comfort and efficiency</p>
                    </div>
                    <div className="recommendation-card">
                        <div className="rec-icon"><HiClock style={{ color: '#a855f7' }} /></div>
                        <h3>Off-peak Usage</h3>
                        <p>Run heavy appliances like washing machines during off-peak hours</p>
                    </div>
                    <div className="recommendation-card">
                        <div className="rec-icon"><HiArrowTrendingUp style={{ color: '#22c55e' }} /></div>
                        <h3>Usage Pattern</h3>
                        <p>Your usage is 15% higher than similar households in your area</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
