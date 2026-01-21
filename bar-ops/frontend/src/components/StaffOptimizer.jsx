import { useState } from 'react';
import { api } from '../api.js';

// Optimizador de personal - Calcula el staff óptimo para un tiempo objetivo
const StaffOptimizer = ({ calculatedData, moduleCount, selectedAccs, selectedZone }) => {
  const [targetTime, setTargetTime] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  const handleOptimize = async () => {
    if (!targetTime || Number(targetTime) <= 0) {
      setError('Introduce un tiempo objetivo válido en minutos.');
      return;
    }

    if (!calculatedData) {
      setError('Primero calcula el tiempo de montaje base.');
      return;
    }

    setError('');
    setOptimizing(true);

    try {
      const payload = {
        module_count: Number(moduleCount),
        accessories: selectedAccs,
        zone_id: Number(selectedZone),
        target_time_minutes: Number(targetTime)
      };

      const response = await api.post('/api/optimize-staff', payload);
      setResult(response.data);
    } catch (err) {
      console.error('Error optimizando staff', err);
      setError('No se pudo calcular la optimización. Intenta de nuevo.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setTargetTime('');
    setError('');
  };

  if (!calculatedData) {
    return null;
  }

  return (
    <div className="optimizer-section">
      <div className="info-card">
        <div className="info-card-header">
          <span className="info-card-icon">👥</span>
          <h4>Optimizador de Personal</h4>
        </div>
        <p>
          Tiempo base actual:{' '}
          <span className="highlight">{calculatedData.total_time_minutes} min</span>.
          Define un tiempo objetivo para calcular el personal necesario.
        </p>
      </div>

      <div className="form-row" style={{ marginTop: 'var(--spacing-md)' }}>
        <div style={{ flex: 1 }}>
          <label>Tiempo objetivo (minutos)</label>
          <input
            type="number"
            min="1"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            placeholder={`Ej: ${Math.floor(calculatedData.total_time_minutes / 2)}`}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={handleOptimize}
            disabled={optimizing || !targetTime}
            style={{ marginBottom: 'var(--spacing-md)' }}
          >
            {optimizing ? (
              <>
                <span className="loading-spinner"></span>
                Calculando...
              </>
            ) : (
              <>
                <span>👥</span>
                Optimizar
              </>
            )}
          </button>
          {result && (
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary"
              style={{ marginBottom: 'var(--spacing-md)', width: 'auto' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="result-card">
          <div className="result-header">
            <div className="result-icon" style={{
              background: result.meets_target
                ? 'linear-gradient(135deg, var(--accent-500), var(--accent-600))'
                : 'linear-gradient(135deg, var(--warning-500), var(--warning-600))'
            }}>
              {result.meets_target ? '✓' : '⚠'}
            </div>
            <div className="result-title">
              <h3>
                {result.meets_target
                  ? 'Objetivo alcanzable'
                  : 'Objetivo no alcanzable'}
              </h3>
              <p>
                {result.meets_target
                  ? `Con ${result.optimal_staff} personas puedes completar en ${result.estimated_time_minutes} min`
                  : `Máximo revisado: ${result.max_staff_checked} personas`}
              </p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{result.optimal_staff}</div>
              <div className="stat-label">Personal óptimo</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{result.estimated_time_minutes}</div>
              <div className="stat-label">Minutos estimados</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{result.target_time_minutes}</div>
              <div className="stat-label">Objetivo (min)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{result.base_time_minutes}</div>
              <div className="stat-label">Base (1 persona)</div>
            </div>
          </div>

          {result.meets_target && result.savings_minutes > 0 && (
            <div className="alert alert-success" style={{ marginTop: 'var(--spacing-md)' }}>
              <strong>Margen de seguridad:</strong> {result.savings_minutes} minutos de margen
              respecto al objetivo.
            </div>
          )}

          {!result.meets_target && (
            <div className="alert alert-warning" style={{ marginTop: 'var(--spacing-md)' }}>
              <strong>Nota:</strong> Incluso con {result.max_staff_checked} personas,
              el tiempo mínimo estimado es {result.estimated_time_minutes} minutos.
              Considera ajustar el objetivo o reducir el alcance del montaje.
            </div>
          )}

          <div className="breakdown-list" style={{ marginTop: 'var(--spacing-md)' }}>
            <div className="breakdown-item">
              <span className="badge">Tiempo fijo</span>
              <span className="value">{result.breakdown.fixed_time} min</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                (transporte + stock)
              </span>
            </div>
            <div className="breakdown-item">
              <span className="badge">Tiempo variable</span>
              <span className="value">{result.breakdown.variable_time} min</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                (montaje + uniones + accesorios)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffOptimizer;
