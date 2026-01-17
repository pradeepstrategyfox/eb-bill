import axios from 'axios';

// Create axios instance with your deployed backend URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://eb-bill-lkcc.onrender.com',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('🔑 API Request:', config.url);
        console.log('📦 Request data:', config.data);
        console.log('🔑 Token present:', !!token);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔑 Auth header set:', config.headers.Authorization.substring(0, 20) + '...');
        } else {
            console.warn('⚠️  No token found in localStorage!');
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
