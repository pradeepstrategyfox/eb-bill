import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    HiSquares2X2, 
    HiBolt, 
    HiCurrencyRupee, 
    HiLightBulb,
    HiHome
} from 'react-icons/hi2';
import './Dashboard.css';

export default function Dashboard() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [consumption, setConsumption] = useState(null);
    const [billing, setBilling] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const homesRes = await api.get('/api/homes');
            setHomes(homesRes.data);
            
            if (homesRes.data.length > 0) {
                const homeId = homesRes.data[0].id; // Default to first home
                setSelectedHome(homesRes.data[0]);
                
                const [consRes, billRes] = await [
                    api.get(`/api/consumption/${homeId}/live`),
                    api.get(`/api/billing/${homeId}/current`)
                ];
                
                // Since api calls above are not awaited together correctly in the original code,
                // I'll stick to sequential or Promise.all if I want to improve, 
                // but let's keep the logic close to original.
                const cRes = await api.get(`/api/consumption/${homeId}/live`);
                const bRes = await api.get(`/api/billing/${homeId}/current`);
                
                setConsumption(cRes.data);
                setBilling(bRes.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAppliance = async (roomId, applianceId, currentState) => {
        try {
            await api.patch(`/api/appliances/${applianceId}/toggle`);
            // Immutable state update
            const updatedConsumption = {
                ...consumption,
                rooms: consumption.rooms.map(r => r.id === roomId ? {
                    ...r,
                    appliances: r.appliances.map(a => a.id === applianceId ? { ...a, status: !currentState } : a)
                } : r)
            };
            
            // Recalculate live load from the newly created state
            let newLiveLoad = 0;
            updatedConsumption.rooms.forEach(r => {
                r.appliances?.forEach(a => {
                    if (a.status) newLiveLoad += a.powerRating;
                });
            });
            updatedConsumption.liveLoad = newLiveLoad;
            
            setConsumption(updatedConsumption);
        } catch (error) {
            console.error('Error toggling appliance:', error);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <LoadingSpinner fullPage />
            </DashboardLayout>
        );
    }

    if (!selectedHome) {
        return (
            <DashboardLayout>
                <div className="empty-state">
                    <div className="empty-icon"><HiSquares2X2 /></div>
                    <h2>Welcome to PowerSense</h2>
                    <p className="mb-24">Get started by setting up your home and appliances.</p>
                    <Link to="/setup" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                        Go to Setup Wizard
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="dashboard-header">
                <h1>{selectedHome.name} Overview</h1>
                <div className="home-selector">
                    {homes.length > 1 && (
                        <select 
                            value={selectedHome.id} 
                            onChange={(e) => {
                                const home = homes.find(h => h.id === parseInt(e.target.value));
                                setSelectedHome(home);
                                // Re-fetch for this home...
                            }}
                        >
                            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="stats-grid">
                <StatCard 
                    icon={<HiBolt />}
                    label="Live Load"
                    value={`${consumption?.liveLoad || 0} W`}
                    change={`${consumption?.activeAppliances || 0} appliances on`}
                    iconColor="#fbbf24"
                />

                <StatCard 
                    icon={<HiSquares2X2 />}
                    label="Today's Usage"
                    value={`${consumption?.today?.toFixed(2) || 0} kWh`}
                    change="Since midnight"
                    iconColor="#0ea5e9"
                />

                <StatCard 
                    icon={<HiCurrencyRupee />}
                    label={billing?.totalSubsidy > 0 ? "Estimated Bill (Subsidized)" : "Estimated Bill"}
                    value={`₹${billing?.totalBill?.toFixed(0) || 0}`}
                    change={
                        billing?.totalSubsidy > 0 
                            ? `${billing?.slab} (Saved ₹${billing.totalSubsidy.toFixed(0)})` 
                            : billing?.slab || 'No data'
                    }
                    iconColor="#22c55e"
                />

                <StatCard 
                    icon={<HiLightBulb />}
                    label="Cycle Units"
                    value={consumption?.cycleUsage?.toFixed(1) || 0}
                    change="kWh consumed"
                    iconColor="#a855f7"
                />
            </div>

            <div className="section quick-controls-section">
                <h2 className="mb-24">Quick Controls</h2>
                {consumption?.rooms?.some(r => r.appliances?.length > 0) ? (
                    <div className="rooms-horizontal-grid">
                        {consumption.rooms.map(room => (
                            room.appliances?.length > 0 && (
                                <div key={room.id} className="room-control-card">
                                    <div className="room-header-main">
                                        <div className="room-icon-bg">
                                            <HiHome />
                                        </div>
                                        <div className="room-header-text">
                                            <div className="title-row">
                                                <h3>{room.name}</h3>
                                                <div className="active-indicator">
                                                    <span className={`status-dot ${room.appliances.some(a => a.status) ? 'active' : ''}`}></span>
                                                    {room.appliances.filter(a => a.status).length} Active
                                                </div>
                                            </div>
                                            <p>{room.appliances.length} Devices</p>
                                        </div>
                                    </div>
                                    
                                    <div className="appliances-inner-list">
                                        {room.appliances.map(appliance => (
                                            <div key={appliance.id} className="appliance-row-item">
                                                <div className="app-basic-info">
                                                    <span className="app-name-label">{appliance.name}</span>
                                                    <span className="app-wattage-label">{appliance.powerRating}W</span>
                                                </div>
                                                <label className="toggle-switch-compact">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={appliance.status}
                                                        onChange={() => toggleAppliance(room.id, appliance.id, appliance.status)}
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-mini">
                        <p>No appliances found. Add your appliances in the <Link to="/setup">Home Setup</Link> section to start tracking.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

// Re-export Layout for other pages
export { DashboardLayout };
