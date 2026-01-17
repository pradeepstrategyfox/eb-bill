import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard({ children }) {
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
            {/* Sidebar */}
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

            {/* Main Content */}
            <div className="main-content">
                {/* Top Bar */}
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

                {/* Page Content */}
                <main className="page-content">
                    <DashboardHome />
                </main>
            </div>
        </div>
    );
}

function DashboardHome() {
    return (
        <div className="dashboard-home">
            <h1>Dashboard</h1>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                        <p className="stat-label">Live Load</p>
                        <h2 className="stat-value">0 W</h2>
                        <p className="stat-change">No appliances on</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <p className="stat-label">Today's Usage</p>
                        <h2 className="stat-value">0 kWh</h2>
                        <p className="stat-change">Start tracking</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <p className="stat-label">Estimated Bill</p>
                        <h2 className="stat-value">₹0</h2>
                        <p className="stat-change">Current cycle</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <p className="stat-label">Billing Cycle</p>
                        <h2 className="stat-value">0/60</h2>
                        <p className="stat-change">Days elapsed</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="section">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <Link to="/setup" className="action-card">
                        <div className="action-icon">🏠</div>
                        <h3>Set Up Home</h3>
                        <p>Configure your rooms and appliances</p>
                    </Link>

                    <Link to="/meter-reading" className="action-card">
                        <div className="action-icon">⚡</div>
                        <h3>Submit Reading</h3>
                        <p>Enter your meter reading</p>
                    </Link>

                    <Link to="/insights" className="action-card">
                        <div className="action-icon">💡</div>
                        <h3>View Insights</h3>
                        <p>See top consumers and trends</p>
                    </Link>

                    <Link to="/bill-explanation" className="action-card">
                        <div className="action-icon">💰</div>
                        <h3>Explain Bill</h3>
                        <p>Understand your electricity bill</p>
                    </Link>
                </div>
            </div>

            {/* Getting Started */}
            <div className="section">
                <div className="info-box">
                    <div className="info-icon">ℹ️</div>
                    <div className="info-content">
                        <h3>Welcome to PowerSense Home!</h3>
                        <p>
                            To get started, set up your home by adding rooms and appliances.
                            Then toggle appliances on and off to track your electricity consumption in real-time.
                        </p>
                        <Link to="/setup" className="btn-primary">
                            Get Started →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
