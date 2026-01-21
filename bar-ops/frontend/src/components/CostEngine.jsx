import { useState } from 'react';
import { api } from '../api.js';

// Motor de recursos humanos y costes (Cubo de Horas)
const CostEngine = ({ calculatedData }) => {
  const [eventDate, setEventDate] = useState('');
  const [costResult, setCostResult] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setError('');
    try {
      const requiredHours = calculatedData
        ? Math.ceil(calculatedData.total_time_minutes / 60)
        : 0;

      const payload = {
        required_hours: requiredHours,
        event_date: eventDate
      };

      console.log('📤 Enviando cálculo de costes', payload);
      const response = await api.post('/api/cost-calculate', payload);
      setCostResult(response.data);
    } catch (err) {
      console.error('❌ Error en coste', err);
      setError('No se pudo calcular el coste.');
    }
  };

  return (
    <div>
      <h2 className="section-title">Módulo C · Cubo de Horas</h2>
      <p>Horas requeridas estimadas: {calculatedData ? Math.ceil(calculatedData.total_time_minutes / 60) : 0} h</p>

      <label>Fecha del evento</label>
      <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />

      <button type="button" onClick={handleAnalyze}>ANALIZAR COSTES</button>

      {error && <div className="alert">{error}</div>}

      {costResult && (
        <div className="alert">
          <p>Capacidad restante: {costResult.remaining_capacity} h</p>
          <p>Horas requeridas: {costResult.required_hours} h</p>
          {!costResult.can_use_fixed && (
            <p><strong>⚠️ Se requiere ETT:</strong> {costResult.ett_hours} h ({costResult.ett_cost} €)</p>
          )}
          <p>{costResult.rule_four_hours}</p>
        </div>
      )}
    </div>
  );
};

export default CostEngine;
