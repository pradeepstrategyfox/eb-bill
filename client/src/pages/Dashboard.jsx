import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import './Dashboard.css';

function DashboardLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/setup', icon: '🏠', label: 'Home Setup' },
        { path: '/insights', icon: '💡', label: 'Insights' },
        { path: '/meter-reading', icon: '⚡', label: 'Meter Reading' },
        { path: '/bill-explanation', icon: '💰', label: 'Bill Breakdown' },
    ];

    return (
        <div className="dashboard-layout">
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">⚡</div>
                        {sidebarOpen && <h2>PowerSense</h2>}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {sidebarOpen && <span className="nav-label">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        <span className="nav-icon">🚪</span>
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <header className="topbar">
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        ☰
                    </button>
                    <div className="topbar-user">
                        <div className="user-avatar">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="user-name">{user?.name || 'User'}</span>
                    </div>
                </header>

                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [consumption, setConsumption] = useState(null);
    const [billing, setBilling] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            console.log('📡 Fetching dashboard data...');
            const homesRes = await api.get('/api/homes');
            console.log('✅ Homes response:', homesRes.data);
            setHomes(homesRes.data);

            if (homesRes.data && homesRes.data.length > 0) {
                const home = homesRes.data[0];
                console.log('🏠 Selected home:', home.id, home.name);
                setSelectedHome(home);

                // Fetch consumption data with error handling
                try {
                    const consRes = await api.get(`/api/consumption/${home.id}/live`);
                    console.log('⚡ Consumption data:', consRes.data);
                    setConsumption(consRes.data);
                } catch (consErr) {
                    console.error('⚠️ Failed to fetch consumption:', consErr.message);
                    setConsumption({ liveLoad: 0, activeAppliances: 0, today: 0, cycleUsage: 0 });
                }

                // Fetch billing data with error handling
                try {
                    const billRes = await api.get(`/api/billing/${home.id}/current`);
                    console.log('💰 Billing data:', billRes.data);
                    setBilling(billRes.data);
                } catch (billErr) {
                    console.error('⚠️ Failed to fetch billing:', billErr.message);
                    setBilling({ totalBill: 0, slab: 'No data' });
                }
            } else {
                console.log('⚠️ No homes found for user');
                setSelectedHome(null);
                setConsumption(null);
                setBilling(null);
            }
        } catch (error) {
            console.error('❌ Error fetching dashboard data:', error);
            console.error('Error details:', error.response?.data || error.message);
            // Don't crash - show empty state
            setHomes([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleAppliance = async (applianceId) => {
        try {
            await api.patch(`/api/appliances/${applianceId}/toggle`);
            fetchData(); // Refresh data
        } catch (error) {
            console.error('Error toggling appliance:', error);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ width: '48px', height: '48px', margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (homes.length === 0) {
        return (
            <DashboardLayout>
                <div className="empty-state">
                    <div className="empty-icon">🏠</div>
                    <h2>No Home Configured</h2>
                    <p>Set up your home to start tracking electricity consumption</p>
                    <Link to="/setup" className="btn-primary">Set Up Home</Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <h1>Dashboard</h1>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                        <p className="stat-label">Live Load</p>
                        <h2 className="stat-value">{consumption?.liveLoad || 0} W</h2>
                        <p className="stat-change">
                            {consumption?.activeAppliances || 0} appliances on
                        </p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <p className="stat-label">Today's Usage</p>
                        <h2 className="stat-value">{consumption?.today?.toFixed(2) || 0} kWh</h2>
                        <p className="stat-change">This billing cycle</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <p className="stat-label">Estimated Bill</p>
                        <h2 className="stat-value">₹{billing?.totalBill?.toFixed(0) || 0}</h2>
                        <p className="stat-change">{billing?.slab || 'No data'}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <p className="stat-label">Cycle Units</p>
                        <h2 className="stat-value">{consumption?.cycleUsage?.toFixed(1) || 0}</h2>
                        <p className="stat-change">kWh consumed</p>
                    </div>
                </div>
            </div>

            <div className="section">
                <h2>Your Appliances</h2>
                {(selectedHome?.rooms || selectedHome?.Rooms || []).map((room) => (
                    <div key={room.id} className="room-section">
                        <h3>{room.name} ({room.type})</h3>
                        <div className="appliances-grid">
                            {(room.appliances || room.Appliances || []).map((appliance) => (
                                <div key={appliance.id} className="appliance-control">
                                    <div className="appliance-info">
                                        <div className="appliance-name">{appliance.name}</div>
                                        <div className="appliance-power">{appliance.wattage}W</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={appliance.isOn}
                                            onChange={() => toggleAppliance(appliance.id)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
}

export { DashboardLayout };
