import axios from 'axios';
import { supabase } from './supabaseClient';

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
    async (config) => {
        try {
            // Get the current session from Supabase (handles auto-refresh)
            const { data: { session } } = await supabase.auth.getSession();
            
            // Prioritize Supabase session token, fallback to localStorage if needed
            const token = session?.access_token || localStorage.getItem('token');
            
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            } else {
                console.warn('⚠️  No active session or token found');
            }
        } catch (error) {
            console.error('Error fetching auth session:', error);
            // Fallback to localStorage if Supabase call fails
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
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
