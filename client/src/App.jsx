import { useState, useEffect } from 'react';
import api from './api';
import './App.css';

function App() {
  const [status, setStatus] = useState('Checking connection...');
  const [backendData, setBackendData] = useState(null);
  const [error, setError] = useState(null);

  // Test backend connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await api.get('/');
        setBackendData(response.data);
        setStatus('✅ Connected to backend!');
        setError(null);
      } catch (err) {
        setStatus('❌ Failed to connect');
        setError(err.message);
      }
    };

    testConnection();
  }, []);

  return (
    <div>
      <h1>PowerSense Home</h1>
      <div className="card">
        <h2>Backend Connection Status</h2>
        <p><strong>Status:</strong> {status}</p>
        {backendData && (
          <div>
            <p><strong>Backend Message:</strong> {backendData.message}</p>
            <p><strong>Version:</strong> {backendData.version}</p>
            <p><strong>Status:</strong> {backendData.status}</p>
          </div>
        )}
        {error && (
          <div style={{ color: 'red' }}>
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Configuration</h3>
        <p><strong>Frontend URL:</strong> eb-bill-virid.vercel.app</p>
        <p><strong>Backend URL:</strong> {import.meta.env.VITE_API_URL || 'https://eb-bill-lkcc.onrender.com'}</p>
      </div>

      <div className="card">
        <h3>Next Steps</h3>
        <ul style={{ textAlign: 'left' }}>
          <li>✅ Frontend and backend URLs configured</li>
          <li>✅ API client created with JWT support</li>
          <li>⏳ Install dependencies: <code>npm install</code></li>
          <li>⏳ Deploy updated frontend to Vercel</li>
          <li>⏳ Update backend CORS with Vercel URL</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
