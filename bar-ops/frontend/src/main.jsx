import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import { warmupBackend } from './api.js';

// Iniciar warm-up del backend inmediatamente al cargar
// Esto ayuda a despertar servidores de Render en plan gratuito
warmupBackend().catch(console.warn);

// Render principal de la aplicación
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
