// In src/config/api.js
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  endpoints: {
    pinJson: '/api/pin-json',
    health: '/api/health'
  }
};