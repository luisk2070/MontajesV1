import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Configurador dinámico de barras (El Lego)
const BarConfig = ({ onCalculated }) => {
  const [zones, setZones] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [moduleCount, setModuleCount] = useState(4);
  const [selectedAccs, setSelectedAccs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [zonesResponse, accessoriesResponse] = await Promise.all([
          api.get('/api/zones'),
          api.get('/api/accessories')
        ]);
        setZones(zonesResponse.data);
        setAccessories(accessoriesResponse.data);
        setSelectedZone(zonesResponse.data[0]?.id || '');
        setError('');
      } catch (err) {
        console.error('Error cargando datos', err);
        setError('No se pudieron cargar zonas o accesorios. Verifica la conexión.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleAccessory = (id) => {
    setSelectedAccs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCalculate = async () => {
    setError('');
    setCalculating(true);
    try {
      const payload = {
        module_count: Number(moduleCount),
        accessories: selectedAccs,
        zone_id: Number(selectedZone)
      };
      const response = await api.post('/api/calculate', payload);
      setResult(response.data);
      onCalculated(response.data);
    } catch (err) {
      console.error('Error calculando', err);
      setError('No se pudo calcular el tiempo total. Intenta de nuevo.');
    } finally {
      setCalculating(false);
    }
  };

  const selectedZoneName = zones.find(z => String(z.id) === String(selectedZone))?.name || '';

  if (loading) {
    return (
      <div>
        <div className="section-title">
          <div className="section-title-icon">⚙</div>
          <div className="section-title-text">
            <h2>Configurador de Barra</h2>
            <p>Cargando datos...</p>
          </div>
        </div>
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Cargando zonas y accesorios...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">
        <div className="section-title-icon">⚙</div>
        <div className="section-title-text">
          <h2>Configurador de Barra</h2>
          <p>Define la configuración del montaje</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="form-group">
        <label>Zona del recinto</label>
        <select
          value={selectedZone}
          onChange={(event) => setSelectedZone(event.target.value)}
          disabled={zones.length === 0}
        >
          {zones.length === 0 ? (
            <option value="">Sin zonas disponibles</option>
          ) : (
            zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} — {zone.travel_minutes} min desplazamiento
              </option>
            ))
          )}
        </select>
      </div>

      <div className="form-group">
        <label>Número de módulos (sin esquinas)</label>
        <input
          type="number"
          min="1"
          max="20"
          value={moduleCount}
          onChange={(event) => setModuleCount(event.target.value)}
          placeholder="Ej: 4"
        />
      </div>

      <div className="form-group">
        <label>Accesorios adicionales</label>
        {accessories.length === 0 ? (
          <div className="empty-state">
            <p>No hay accesorios disponibles</p>
          </div>
        ) : (
          <div className="checkbox-group">
            {accessories.map((accessory) => (
              <label key={accessory.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedAccs.includes(accessory.id)}
                  onChange={() => toggleAccessory(accessory.id)}
                />
                <span>{accessory.name}</span>
                <span className="time-badge">+{accessory.extra_minutes} min</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        disabled={calculating || !selectedZone}
        className="btn-success"
      >
        {calculating ? (
          <>
            <span className="loading-spinner"></span>
            Calculando...
          </>
        ) : (
          <>
            <span>⏱</span>
            Calcular Tiempo
          </>
        )}
      </button>

      {result && (
        <div className="result-card">
          <div className="result-header">
            <div className="result-icon">✓</div>
            <div className="result-title">
              <h3>Cálculo completado</h3>
              <p>{selectedZoneName} — {moduleCount} módulos</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{result.total_time_minutes}</div>
              <div className="stat-label">Minutos totales</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{Math.ceil(result.total_time_minutes / 60)}</div>
              <div className="stat-label">Horas estimadas</div>
            </div>
          </div>

          <div className="breakdown-list">
            <div className="breakdown-item">
              <span className="badge">Transporte</span>
              <span className="value">{result.breakdown.transporte} min</span>
            </div>
            <div className="breakdown-item">
              <span className="badge">Montaje</span>
              <span className="value">{result.breakdown.montaje_modulos} min</span>
            </div>
            <div className="breakdown-item">
              <span className="badge">Uniones</span>
              <span className="value">{result.breakdown.montaje_uniones} min</span>
            </div>
            <div className="breakdown-item">
              <span className="badge">Accesorios</span>
              <span className="value">{result.breakdown.accesorios} min</span>
            </div>
            <div className="breakdown-item">
              <span className="badge">Stock</span>
              <span className="value">{result.breakdown.llenado_stock} min</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarConfig;
