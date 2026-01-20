import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';
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
                const { data: homesData, error: homesError } = await supabase
                    .from('ps_homes')
                    .select('*, ps_rooms(*, ps_appliances(*))')
                    .order('created_at');
                
                if (homesError) throw homesError;
                setHomes(homesData);

                if (homesData.length > 0) {
                    const home = homesData[0];
                    setSelectedHome(home);
                    
                    // Fetch top consumers logic
                    const applianceIds = home.ps_rooms.flatMap(r => r.ps_appliances.map(a => a.id));
                    
                    const { data: logs, error: logsError } = await supabase
                        .from('ps_appliance_usage_logs')
                        .select('appliance_id, energy_consumed_kwh')
                        .in('appliance_id', applianceIds);

                    if (logsError) throw logsError;

                    // Aggregate logs by appliance
                    const consumptionMap = {};
                    logs.forEach(log => {
                        consumptionMap[log.appliance_id] = (consumptionMap[log.appliance_id] || 0) + (log.energy_consumed_kwh || 0);
                    });

                    // Add in-progress consumption for appliances that are currently ON
                    const now = new Date();
                    const { data: activeLogs } = await supabase
                        .from('ps_appliance_usage_logs')
                        .select('appliance_id, turned_on_at')
                        .is('turned_off_at', null)
                        .in('appliance_id', applianceIds);

                    if (activeLogs) {
                        activeLogs.forEach(log => {
                            // Find the appliance wattage
                            const appliance = home.ps_rooms
                                .flatMap(r => r.ps_appliances)
                                .find(a => a.id === log.appliance_id);
                            
                            if (appliance) {
                                const start = new Date(log.turned_on_at);
                                const durationHrs = (now - start) / (1000 * 60 * 60);
                                const liveKwh = (appliance.wattage / 1000) * durationHrs;
                                consumptionMap[log.appliance_id] = (consumptionMap[log.appliance_id] || 0) + liveKwh;
                            }
                        });
                    }

                    const topConsumers = home.ps_rooms.flatMap(r => r.ps_appliances.map(a => ({
                        id: a.id,
                        name: a.name,
                        roomName: r.name,
                        totalKwh: consumptionMap[a.id] || 0,
                        estimatedCost: (consumptionMap[a.id] || 0) * 5 // Fixed rate for now
                    })))
                    .filter(a => a.totalKwh > 0.0001) // Filter out negligible amounts
                    .sort((a, b) => b.totalKwh - a.totalKwh)
                    .slice(0, 5);

                    setInsights({ topConsumers });
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
