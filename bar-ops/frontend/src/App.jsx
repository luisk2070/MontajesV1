import { useState } from 'react';
import BarConfig from './components/BarConfig.jsx';
import CostEngine from './components/CostEngine.jsx';
import Calendar from './components/Calendar.jsx';

// Layout principal en 2 columnas estilo sistema operativo
const App = () => {
  const [calculatedData, setCalculatedData] = useState(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Bar-Ops · Sistema Operativo Roig Arena</h1>
        <p>Gestión integral de montajes de barras móviles</p>
      </header>

      <div className="app-grid">
        <div className="panel">
          <BarConfig onCalculated={setCalculatedData} />
        </div>

        <div className="panel">
          <CostEngine calculatedData={calculatedData} />
        </div>

        <div className="panel full-width">
          <Calendar />
        </div>
      </div>
    </div>
  );
};

export default App;
