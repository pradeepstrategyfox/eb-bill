import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
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
        
        // Set up real-time subscription for appliance status
        const applianceSubscription = supabase
            .channel('appliance-updates')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'ps_appliances' 
            }, () => {
                // Refresh data when appliance states change
                fetchData(false);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(applianceSubscription);
        };
    }, []);

    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            
            // 1. Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 2. Get homes with rooms and appliances
            const { data: homesData, error: homesError } = await supabase
                .from('ps_homes')
                .select(`
                    *,
                    ps_rooms (
                        *,
                        ps_appliances (*)
                    )
                `)
                .order('created_at');

            if (homesError) throw homesError;
            setHomes(homesData || []);

            if (homesData && homesData.length > 0) {
                const home = selectedHome ? homesData.find(h => h.id === selectedHome.id) : homesData[0];
                setSelectedHome(home);
                
                // 3. Trigger a bill sync for the current home to ensure latest data
                await supabase.rpc('sync_billing_estimate', { home_id_param: home.id });

                // 4. Get billing data for selected home
                const { data: billingData, error: billingError } = await supabase
                    .from('ps_billing_cycles')
                    .select('*')
                    .eq('home_id', home.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (billingError) throw billingError;
                
                // 4. Calculate consumption stats from home data
                let liveLoad = 0;
                let activeAppliances = 0;
                
                home.ps_rooms?.forEach(room => {
                    room.ps_appliances?.forEach(app => {
                        if (app.is_on) {
                            liveLoad += (app.wattage || 0);
                            activeAppliances++;
                        }
                    });
                });

                // 5. Get cycle consumption from logs (Live calculation)
                // 5. Get cycle consumption from logs (Finished + Active)
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                const startDate = billingData?.start_date || thirtyDaysAgo.toISOString();

                const { data: allLogs, error: allLogsError } = await supabase
                    .from('ps_appliance_usage_logs')
                    .select('appliance_id, energy_consumed_kwh, turned_on_at, turned_off_at')
                    .gte('turned_on_at', startDate)
                    .in('appliance_id', home.ps_rooms.flatMap(r => r.ps_appliances.map(a => a.id)));

                if (allLogsError) throw allLogsError;

                let cycleUsage = 0;
                let todayUsage = 0;
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                allLogs?.forEach(log => {
                    let logEnergy = log.energy_consumed_kwh || 0;
                    
                    // If session is still active, calculate its consumption so far
                    if (!log.turned_off_at) {
                        const app = home.ps_rooms.flatMap(r => r.ps_appliances).find(a => a.id === log.appliance_id);
                        if (app) {
                            const durationHrs = (now - new Date(log.turned_on_at)) / (1000 * 60 * 60);
                            logEnergy = (app.wattage / 1000) * durationHrs;
                        }
                    }

                    cycleUsage += logEnergy;
                    if (new Date(log.turned_on_at) >= todayStart) {
                        todayUsage += logEnergy;
                    }
                });

                setConsumption({
                    liveLoad,
                    activeAppliances,
                    today: todayUsage,
                    cycleUsage: cycleUsage,
                    rooms: home.ps_rooms.map(r => ({
                        id: r.id,
                        name: r.name,
                        type: r.type,
                        appliances: r.ps_appliances.map(a => ({
                            id: a.id,
                            name: a.name,
                            powerRating: a.wattage,
                            status: a.is_on
                        }))
                    }))
                });

                setBilling({
                    totalBill: billingData?.estimated_bill || (cycleUsage * 5),
                    totalSubsidy: 0,
                    slab: 'Standard Rate'
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const toggleAppliance = async (roomId, applianceId, currentState) => {
        try {
            const { data, error } = await supabase.rpc('toggle_appliance_state', { 
                target_appliance_id: applianceId 
            });
            
            if (error) throw error;
            
            // The subscription will handle the UI update, but for better UX we can update locally
            setConsumption(prev => {
                const updatedRooms = prev.rooms.map(r => r.id === roomId ? {
                    ...r,
                    appliances: r.appliances.map(a => a.id === applianceId ? { ...a, status: !currentState } : a)
                } : r);
                
                let newLiveLoad = 0;
                let newActiveCount = 0;
                updatedRooms.forEach(r => {
                    r.appliances.forEach(a => {
                        if (a.status) {
                            newLiveLoad += a.powerRating;
                            newActiveCount++;
                        }
                    });
                });

                return {
                    ...prev,
                    rooms: updatedRooms,
                    liveLoad: newLiveLoad,
                    activeAppliances: newActiveCount
                };
            });

            // 4. Refresh all data (including bill) without showing a loader
            await fetchData(false);
        } catch (error) {
            console.error('Error toggling appliance:', error);
            toast.error('Failed to toggle appliance');
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
                                const home = homes.find(h => h.id === e.target.value);
                                setSelectedHome(home);
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
