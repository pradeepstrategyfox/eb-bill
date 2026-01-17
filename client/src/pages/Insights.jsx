import { useState, useEffect } from 'react';
import { DashboardLayout } from './Dashboard';
import api from '../api';

export default function Insights() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [insights, setInsights] = useState(null);
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

                const insightsRes = await api.get(`/api/homes/${home.id}/consumption/insights`);
                setInsights(insightsRes.data);
            }
        } catch (error) {
            console.error('Error fetching insights:', error);
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

    if (homes.length === 0) {
        return (
            <DashboardLayout>
                <div className="empty-state">
                    <h2>No Data Available</h2>
                    <p>Set up your home first</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <h1>Insights & Analytics</h1>

            <div className="section">
                <h2>Top Power Consumers</h2>
                <div className="top-consumers">
                    {insights?.topConsumers?.length > 0 ? (
                        insights.topConsumers.map((item, index) => (
                            <div key={index} className="consumer-card">
                                <div className="consumer-rank">#{index + 1}</div>
                                <div className="consumer-info">
                                    <div className="consumer-name">{item.name}</div>
                                    <div className="consumer-room">{item.roomName}</div>
                                </div>
                                <div className="consumer-stats">
                                    <div className="consumer-energy">{item.totalEnergy?.toFixed(2)} kWh</div>
                                    <div className="consumer-cost">₹{item.cost?.toFixed(2)}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="empty-message">No consumption data yet. Toggle some appliances!</p>
                    )}
                </div>
            </div>

            <div className="section">
                <h2>Recommendations</h2>
                <div className="recommendations-grid">
                    <div className="recommendation-card">
                        <div className="rec-icon">💡</div>
                        <h3>Use LED Bulbs</h3>
                        <p>Replace incandescent bulbs with LED to save up to 85% energy</p>
                    </div>
                    <div className="recommendation-card">
                        <div className="rec-icon">❄️</div>
                        <h3>AC Temperature</h3>
                        <p>Set AC to 24-25°C for optimal comfort and efficiency</p>
                    </div>
                    <div className="recommendation-card">
                        <div className="rec-icon">⏰</div>
                        <h3>Peak Hours</h3>
                        <p>Avoid using high-power appliances during 6-10 PM</p>
                    </div>
                    <div className="recommendation-card">
                        <div className="rec-icon">🌬️</div>
                        <h3>BLDC Fans</h3>
                        <p>Upgrade to BLDC fans to save 50% on fan electricity</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
