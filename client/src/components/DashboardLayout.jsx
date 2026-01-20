import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
    HiSquares2X2, 
    HiHome, 
    HiArrowTrendingUp, 
    HiBolt, 
    HiCurrencyRupee, 
    HiArrowRightOnRectangle,
    HiLightBulb,
    HiSun,
    HiMoon
} from 'react-icons/hi2';

export default function DashboardLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    // Initialize theme from localStorage or system preference
    const getInitialTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    };
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            if (supabaseUser) {
                setUser({
                    id: supabaseUser.id,
                    email: supabaseUser.email,
                    name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0]
                });
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuOpen && !event.target.closest('.topbar-user')) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [profileMenuOpen]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: <HiSquares2X2 />, label: 'Dashboard' },
        { path: '/setup', icon: <HiHome />, label: 'Home Setup' },
        { path: '/insights', icon: <HiArrowTrendingUp />, label: 'Insights' },
        { path: '/meter-reading', icon: <HiBolt />, label: 'Meter Reading' },
        { path: '/bill-explanation', icon: <HiCurrencyRupee />, label: 'Bill Breakdown' },
    ];

    return (
        <div className="dashboard-layout" data-sidebar-closed={!sidebarOpen}>
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon"><HiBolt /></div>
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
                    <button onClick={toggleTheme} className="theme-toggle-btn">
                        <span className="nav-icon">
                            {theme === 'light' ? <HiMoon /> : <HiSun />}
                        </span>
                        {sidebarOpen && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        {location.pathname === '/setup' && (
                            <Link to="/dashboard" className="header-home-btn" title="Go to Dashboard">
                                <HiHome />
                            </Link>
                        )}
                    </div>
                    <div 
                        className={`topbar-user ${profileMenuOpen ? 'active' : ''}`}
                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    >
                        <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
                        <div className="user-info">
                            <span className="user-name">{user?.name || 'User'}</span>
                            <span className="user-role">Home Owner</span>
                        </div>
                        
                        {profileMenuOpen && (
                            <div className="profile-dropdown glass">
                                <div className="dropdown-header">
                                    <p className="dropdown-user-name">{user?.name}</p>
                                    <p className="dropdown-user-email">{user?.email}</p>
                                </div>
                                <div className="dropdown-divider"></div>
                                <button onClick={handleLogout} className="dropdown-item logout">
                                    <HiArrowRightOnRectangle />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
