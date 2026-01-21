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

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Cargando zonas y accesorios');
        const [zonesResponse, accessoriesResponse] = await Promise.all([
          api.get('/api/zones'),
          api.get('/api/accessories')
        ]);
        setZones(zonesResponse.data);
        setAccessories(accessoriesResponse.data);
        setSelectedZone(zonesResponse.data[0]?.id || '');
      } catch (err) {
        console.error('❌ Error cargando datos', err);
        setError('No se pudieron cargar zonas o accesorios.');
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
    try {
      const payload = {
        module_count: Number(moduleCount),
        accessories: selectedAccs,
        zone_id: Number(selectedZone)
      };
      console.log('📤 Enviando cálculo', payload);
      const response = await api.post('/api/calculate', payload);
      setResult(response.data);
      onCalculated(response.data);
    } catch (err) {
      console.error('❌ Error calculando', err);
      setError('No se pudo calcular el tiempo total.');
    }
  };

  return (
    <div>
      <h2 className="section-title">Módulo A · Configurador de Barra</h2>
      <label>Zona del recinto</label>
      <select value={selectedZone} onChange={(event) => setSelectedZone(event.target.value)}>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name} ({zone.travel_minutes} min)
          </option>
        ))}
      </select>

      <label>Número de módulos (sin esquinas)</label>
      <input
        type="number"
        min="1"
        value={moduleCount}
        onChange={(event) => setModuleCount(event.target.value)}
      />

      <label>Accesorios adicionales</label>
      {accessories.map((accessory) => (
        <label key={accessory.id}>
          <input
            type="checkbox"
            checked={selectedAccs.includes(accessory.id)}
            onChange={() => toggleAccessory(accessory.id)}
          />
          {accessory.name} (+{accessory.extra_minutes} min)
        </label>
      ))}

      <button type="button" onClick={handleCalculate}>CALCULAR</button>

      {error && <div className="alert">{error}</div>}

      {result && (
        <div className="alert">
          <h3>Tiempo total: {result.total_time_minutes} min</h3>
          <ul className="list">
            <li><span className="badge">Transporte</span>{result.breakdown.transporte} min</li>
            <li><span className="badge">Montaje</span>{result.breakdown.montaje_modulos} min</li>
            <li><span className="badge">Uniones</span>{result.breakdown.montaje_uniones} min</li>
            <li><span className="badge">Accesorios</span>{result.breakdown.accesorios} min</li>
            <li><span className="badge">Stock</span>{result.breakdown.llenado_stock} min</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default BarConfig;
