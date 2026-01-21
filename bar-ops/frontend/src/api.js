import axios from 'axios';

// ============================================
// CONFIGURACIÓN DE API
// ============================================

// Detecta entorno de producción en Render usando la URL
const API_URL = import.meta.env.PROD
  ? 'https://TU-BACKEND.onrender.com'
  : '';

// Configuración de reintentos
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo base
  maxDelay: 8000,  // 8 segundos máximo
};

// ============================================
// UTILIDADES DE RETRY
// ============================================

/**
 * Espera un tiempo determinado
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calcula el delay con backoff exponencial
 */
const getRetryDelay = (attemptNumber) => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attemptNumber);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
};

/**
 * Determina si el error es recuperable (vale la pena reintentar)
 */
const isRetryableError = (error) => {
  // Errores de red (sin respuesta del servidor)
  if (!error.response) {
    return true;
  }

  // Errores del servidor que pueden ser temporales
  const retryableStatuses = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];

  return retryableStatuses.includes(error.response.status);
};

// ============================================
// INSTANCIA DE AXIOS CON RETRY
// ============================================

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos timeout
});

// Interceptor de respuesta para manejar reintentos
api.interceptors.response.use(
  // Si la respuesta es exitosa, devolverla tal cual
  (response) => response,

  // Si hay error, intentar reintentar
  async (error) => {
    const config = error.config;

    // Inicializar contador de reintentos
    config.__retryCount = config.__retryCount || 0;

    // Verificar si debemos reintentar
    if (config.__retryCount >= RETRY_CONFIG.maxRetries || !isRetryableError(error)) {
      return Promise.reject(error);
    }

    // Incrementar contador
    config.__retryCount += 1;

    // Calcular delay
    const delay = getRetryDelay(config.__retryCount - 1);

    console.log(
      `🔄 Reintentando petición (${config.__retryCount}/${RETRY_CONFIG.maxRetries}) en ${delay}ms...`,
      config.url
    );

    // Esperar antes de reintentar
    await sleep(delay);

    // Reintentar la petición
    return api(config);
  }
);

// ============================================
// WARM-UP DEL BACKEND
// ============================================

let isWarmedUp = false;
let warmupPromise = null;

/**
 * Despierta el backend de Render si está dormido
 * Hace una petición al health endpoint antes de cualquier otra operación
 */
export const warmupBackend = async () => {
  if (isWarmedUp) {
    return true;
  }

  // Si ya hay un warmup en progreso, esperar a que termine
  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    try {
      console.log('🔥 Iniciando warm-up del backend...');

      const startTime = Date.now();
      const response = await api.get('/api/health', {
        timeout: 60000, // 60 segundos para el warm-up (Render puede tardar)
      });

      const elapsed = Date.now() - startTime;
      console.log(`✅ Backend activo (${elapsed}ms)`, response.data);

      isWarmedUp = true;
      return true;
    } catch (error) {
      console.warn('⚠️ Warm-up falló, continuando de todos modos...', error.message);
      // No marcar como warmed up, pero permitir continuar
      return false;
    } finally {
      warmupPromise = null;
    }
  })();

  return warmupPromise;
};

/**
 * Resetea el estado de warm-up (útil para testing o reconexión)
 */
export const resetWarmup = () => {
  isWarmedUp = false;
  warmupPromise = null;
};

// ============================================
// API HELPERS CON WARM-UP AUTOMÁTICO
// ============================================

/**
 * Wrapper que hace warm-up automático antes de la primera petición
 */
export const apiWithWarmup = {
  async get(url, config) {
    await warmupBackend();
    return api.get(url, config);
  },

  async post(url, data, config) {
    await warmupBackend();
    return api.post(url, data, config);
  },

  async put(url, data, config) {
    await warmupBackend();
    return api.put(url, data, config);
  },

  async delete(url, config) {
    await warmupBackend();
    return api.delete(url, config);
  },
};

// ============================================
// EXPORTS
// ============================================

export { api };
export default API_URL;
