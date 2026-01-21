import { useState } from 'react';
import BarConfig from './components/BarConfig.jsx';
import CostEngine from './components/CostEngine.jsx';
import Calendar from './components/Calendar.jsx';

// Definición de las tabs de navegación
const TABS = [
  {
    id: 'all',
    label: 'Vista General',
    icon: '◫',
    description: 'Ver todos los módulos'
  },
  {
    id: 'config',
    label: 'Configurador',
    icon: '⚙',
    description: 'Configurar barras'
  },
  {
    id: 'costs',
    label: 'Cubo de Horas',
    icon: '⏱',
    description: 'Calcular costes'
  },
  {
    id: 'calendar',
    label: 'Planificador',
    icon: '📅',
    description: 'Gestionar eventos'
  }
];

const App = () => {
  const [calculatedData, setCalculatedData] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Determinar qué paneles mostrar según la tab activa
  const showConfig = activeTab === 'all' || activeTab === 'config';
  const showCosts = activeTab === 'all' || activeTab === 'costs';
  const showCalendar = activeTab === 'all' || activeTab === 'calendar';

  return (
    <div className="app-container">
      {/* Header mejorado */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="header-logo">⬡</div>
            <div className="header-title">
              <h1>Bar-Ops</h1>
              <p>Sistema Operativo Roig Arena</p>
            </div>
          </div>
          <div className="header-status">
            <span className="status-dot"></span>
            <span>Sistema activo</span>
          </div>
        </div>
      </header>

      {/* Navegación por tabs */}
      <nav className="nav-container">
        <div className="nav-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
            >
              <span className="nav-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Grid de paneles */}
      <div className={`app-grid ${activeTab !== 'all' ? 'single-panel-view' : ''}`}>
        {showConfig && (
          <div className="panel">
            <BarConfig onCalculated={setCalculatedData} />
          </div>
        )}

        {showCosts && (
          <div className="panel">
            <CostEngine calculatedData={calculatedData} />
          </div>
        )}

        {showCalendar && (
          <div className={`panel ${activeTab === 'all' ? 'full-width' : ''}`}>
            <Calendar />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <p>Bar-Ops v1.0 — Sistema de gestión de montajes</p>
      </footer>
    </div>
  );
};

export default App;
