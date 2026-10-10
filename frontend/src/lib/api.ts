import axios from 'axios';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:5000/api`;
    }
    // FIX L-08: Use HTTPS for all non-localhost origins (including LAN IPs)
    // LAN addresses (192.168.x.x) should also use HTTPS via a local certificate
    if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      return `https://${host}:5000/api`;
    }
  }
  return 'https://nepal-mavi-erp.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  // FIX H-06: withCredentials=true enables the browser to send the HttpOnly JWT cookie
  // on every request. The server sets this cookie on login.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Still attach token from localStorage as Bearer header for backward compatibility
  // (devices that don't support cookies, React Native, etc.)
  // The server accepts both cookie and Authorization header.
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('erp_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // If 401 Unauthorized, clear local storage token
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
    }
    return Promise.reject(err);
  }
);

export default api;
