import { useState, useEffect } from 'react';
import { DashboardLayout } from './Dashboard';
import api from '../api';

export default function MeterReading() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [reading, setReading] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const homesRes = await api.get('/api/homes');
            setHomes(homesRes.data);

            if (homesRes.data && homesRes.data.length > 0) {
                const home = homesRes.data[0]; // ✅ Fixed: use API response data, not empty state
                setSelectedHome(home);

                // Fetch meter reading history - correct path
                const historyRes = await api.get(`/api/meter/homes/${home.id}/meter-readings`);
                setHistory(historyRes.data);
            }
        } catch (error) {
            console.error('❌ Error fetching data:', error);
            console.error('Error details:', error.response?.data);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Check if home is selected
            if (!selectedHome || !selectedHome.id) {
                setError('Home not found. Please complete setup first.');
                return;
            }

            // Submit to correct backend path
            await api.post(`/api/meter/homes/${selectedHome.id}/meter-readings`, {
                readingValue: parseFloat(reading)
            });
            setSuccess('Meter reading submitted successfully!');
            setReading('');
            fetchData();
        } catch (err) {
            console.error('❌ Meter reading error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to submit reading';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (homes.length === 0) {
        return (
            <DashboardLayout>
                <div className="empty-state">
                    <h2>No Home Configured</h2>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <h1>Meter Reading</h1>

            <div className="section">
                <div className="form-card">
                    <h2>Submit Reading</h2>
                    <p>Enter your current electricity meter reading to track accuracy</p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Meter Reading (kWh)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={reading}
                                onChange={(e) => setReading(e.target.value)}
                                placeholder="1234.5"
                                required
                                disabled={loading}
                            />
                        </div>

                        {success && <div className="success-message">{success}</div>}
                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Reading'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="section">
                <h2>Reading History</h2>
                {history.length > 0 ? (
                    <div className="history-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Reading (kWh)</th>
                                    <th>Variance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item) => (
                                    <tr key={item.id}>
                                        <td>{new Date(item.readingDate).toLocaleDateString()}</td>
                                        <td>{item.readingValue}</td>
                                        <td className={item.variancePercentage > 10 ? 'high-variance' : ''}>
                                            {item.variancePercentage ? `${item.variancePercentage.toFixed(1)}%` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="empty-message">No readings submitted yet</p>
                )}
            </div>
        </DashboardLayout>
    );
}
