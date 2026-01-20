import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { HiBolt, HiOutlineCheckBadge } from 'react-icons/hi2';
import './Auth.css';

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError(''); // Clear error when user types
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (signInError) throw signInError;

            // Store token and user data for existing app logic
            localStorage.setItem('token', data.session.access_token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name || data.user.email.split('@')[0],
            }));

            // Navigate to dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo">
                        <div className="logo-icon"><HiBolt /></div>
                        <h1>PowerSense Home</h1>
                    </div>
                    <p className="auth-subtitle">Track your electricity, predict your bill</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Logging in...
                            </>
                        ) : (
                            'Login'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account?{' '}
                        <Link to="/signup" className="link-primary">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>

            <div className="auth-info">
                <div className="info-card">
                    <h3><HiOutlineCheckBadge style={{ color: '#00a3ff', marginRight: '8px' }} /> Real-time Tracking</h3>
                    <p>Monitor your electricity consumption as it happens</p>
                </div>
                <div className="info-card">
                    <h3><HiOutlineCheckBadge style={{ color: '#00a3ff', marginRight: '8px' }} /> Accurate Predictions</h3>
                    <p>Get TNEB bill estimates before your actual bill arrives</p>
                </div>
                <div className="info-card">
                    <h3><HiOutlineCheckBadge style={{ color: '#00a3ff', marginRight: '8px' }} /> Smart Insights</h3>
                    <p>Discover which appliances consume the most power</p>
                </div>
            </div>
        </div>
    );
}
