import { useState } from 'react';
import { api } from '../api.js';

// Motor de recursos humanos y costes (Cubo de Horas)
const CostEngine = ({ calculatedData }) => {
  const [eventDate, setEventDate] = useState('');
  const [costResult, setCostResult] = useState(null);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const requiredHours = calculatedData
    ? Math.ceil(calculatedData.total_time_minutes / 60)
    : 0;

  const handleAnalyze = async () => {
    if (!eventDate) {
      setError('Selecciona una fecha para el evento.');
      return;
    }

    setError('');
    setAnalyzing(true);
    try {
      const payload = {
        required_hours: requiredHours,
        event_date: eventDate
      };

      const response = await api.post('/api/cost-calculate', payload);
      setCostResult(response.data);
    } catch (err) {
      console.error('Error en coste', err);
      setError('No se pudo calcular el coste. Intenta de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className="section-title">
        <div className="section-title-icon">⏱</div>
        <div className="section-title-text">
          <h2>Cubo de Horas</h2>
          <p>Analiza costes y disponibilidad de recursos</p>
        </div>
      </div>

      {/* Info card con datos del cálculo previo */}
      <div className="info-card">
        <div className="info-card-header">
          <span className="info-card-icon">📊</span>
          <h4>Datos del cálculo</h4>
        </div>
        {calculatedData ? (
          <p>
            Se requieren aproximadamente{' '}
            <span className="highlight">{requiredHours} horas</span> para el montaje
            ({calculatedData.total_time_minutes} minutos).
          </p>
        ) : (
          <p>
            Primero configura y calcula el tiempo de montaje en el{' '}
            <strong>Configurador de Barra</strong>.
          </p>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="form-group">
        <label>Fecha del evento</label>
        <input
          type="date"
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        {eventDate && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '-8px' }}>
            {formatDate(eventDate)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={analyzing || !calculatedData || !eventDate}
      >
        {analyzing ? (
          <>
            <span className="loading-spinner"></span>
            Analizando...
          </>
        ) : (
          <>
            <span>📈</span>
            Analizar Costes
          </>
        )}
      </button>

      {costResult && (
        <div className="result-card">
          <div className="result-header">
            <div className="result-icon" style={{
              background: costResult.can_use_fixed
                ? 'linear-gradient(135deg, var(--accent-500), var(--accent-600))'
                : 'linear-gradient(135deg, var(--warning-500), var(--warning-600))'
            }}>
              {costResult.can_use_fixed ? '✓' : '⚠'}
            </div>
            <div className="result-title">
              <h3>
                {costResult.can_use_fixed
                  ? 'Capacidad disponible'
                  : 'Se requiere personal extra'}
              </h3>
              <p>{formatDate(eventDate)}</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{costResult.remaining_capacity}</div>
              <div className="stat-label">Horas disponibles</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{costResult.required_hours}</div>
              <div className="stat-label">Horas requeridas</div>
            </div>
          </div>

          {!costResult.can_use_fixed && (
            <div className="alert alert-warning" style={{ marginTop: 'var(--spacing-md)' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                Se requiere personal ETT
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
                Horas adicionales: <strong>{costResult.ett_hours} h</strong>
                <br />
                Coste estimado: <strong>{costResult.ett_cost} €</strong>
              </p>
            </div>
          )}

          {costResult.rule_four_hours && (
            <div className="info-card" style={{ marginTop: 'var(--spacing-md)' }}>
              <div className="info-card-header">
                <span className="info-card-icon">💡</span>
                <h4>Información</h4>
              </div>
              <p>{costResult.rule_four_hours}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CostEngine;
