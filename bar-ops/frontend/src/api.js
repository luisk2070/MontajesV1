import axios from 'axios';

// Detecta entorno de producción en Render usando la URL
const API_URL = import.meta.env.PROD
  ? 'https://TU-BACKEND.onrender.com'
  : '';

export const api = axios.create({
  baseURL: API_URL
});

export default API_URL;
