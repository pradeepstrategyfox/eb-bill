import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { supabase } from '../supabaseClient';
import { HiBolt, HiClipboardDocumentList } from 'react-icons/hi2';

export default function MeterReading() {
    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newReading, setNewReading] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: homesData, error: homesError } = await supabase
                    .from('ps_homes')
                    .select('*')
                    .order('created_at');
                
                if (homesError) throw homesError;
                setHomes(homesData);

                if (homesData && homesData.length > 0) {
                    const homeId = homesData[0].id;
                    setSelectedHome(homesData[0]);
                    
                    const { data: readings, error: readingsError } = await supabase
                        .from('ps_meter_readings')
                        .select('*')
                        .eq('home_id', homeId)
                        .order('reading_date', { ascending: false });

                    if (readingsError) throw readingsError;
                    setHistory(readings || []);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newReading || !selectedHome) return;

        try {
            setSubmitting(true);
            const { error } = await supabase
                .from('ps_meter_readings')
                .insert({
                    home_id: selectedHome.id,
                    reading_value: parseFloat(newReading)
                });

            if (error) throw error;

            setNewReading('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            
            // Refresh history
            const { data: readings } = await supabase
                .from('ps_meter_readings')
                .select('*')
                .eq('home_id', selectedHome.id)
                .order('reading_date', { ascending: false });
            
            setHistory(readings || []);
        } catch (error) {
            console.error('Submission error:', error);
            alert('Error submitting reading');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;

    if (!selectedHome) {
        return (
            <DashboardLayout>
                <EmptyState 
                    icon={<HiClipboardDocumentList />}
                    title="No Home Configured"
                />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="dashboard-header">
                <h1>Meter Readings</h1>
                <p className="subtitle">Track your physical meter readings to improve accuracy</p>
            </div>

            <div className="form-card mb-32">
                <h2 className="mb-24">Submit New Reading</h2>
                
                {showSuccess && (
                    <div className="success-message mb-24">
                        Reading submitted successfully!
                    </div>
                )}

                <form onSubmit={handleSubmit} className="reading-form">
                    <div className="form-group">
                        <label>Current Meter Value (kWh)</label>
                        <div className="input-with-icon">
                            <span className="input-icon"><HiBolt /></span>
                            <input 
                                type="number" 
                                step="any"
                                min="0"
                                value={newReading}
                                onChange={(e) => setNewReading(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                onWheel={(e) => e.target.blur()}
                                placeholder="Enter current reading from your meter"
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={submitting}>
                        {submitting ? <LoadingSpinner size="20px" /> : 'Submit Reading'}
                    </button>
                </form>
            </div>

            <div className="section">
                <h2>Reading History</h2>
                <div className="history-table">
                    {history.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Reading</th>
                                    <th>Consumption</th>
                                    <th>Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item, index) => (
                                    <tr key={index}>
                                        <td>{new Date(item.reading_date || item.created_at).toLocaleDateString()}</td>
                                        <td>{item.reading_value} kWh</td>
                                        <td>{item.variance_percentage ? `${item.variance_percentage}%` : '-'}</td>
                                        <td>Manual</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState 
                            title="No readings found"
                            message="Start by submitting your first meter reading above."
                        />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
