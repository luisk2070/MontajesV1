import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Calendario básico con eventos sincronizados al backend
const Calendar = () => {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [zones, setZones] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadEvents = async () => {
    try {
      const response = await api.get('/api/events');
      setEvents(response.data);
    } catch (err) {
      console.error('Error cargando eventos', err);
      setError('No se pudieron cargar los eventos.');
    }
  };

  const loadZones = async () => {
    try {
      const response = await api.get('/api/zones');
      setZones(response.data);
      setSelectedZone(response.data[0]?.id || '');
    } catch (err) {
      console.error('Error cargando zonas', err);
      setError('No se pudieron cargar las zonas.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadZones(), loadEvents()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleAddEvent = async () => {
    if (!eventName.trim()) {
      setError('Introduce un nombre para el evento.');
      return;
    }
    if (!eventDate) {
      setError('Selecciona una fecha para el evento.');
      return;
    }
    if (!selectedZone) {
      setError('Selecciona una zona.');
      return;
    }

    setSaving(true);
    try {
      setError('');
      const payload = {
        event_name: eventName.trim(),
        event_date: eventDate,
        zone_id: Number(selectedZone),
        required_hours: 0,
        bar_config: {
          source: 'calendar'
        }
      };

      await api.post('/api/events', payload);
      setEventName('');
      setEventDate('');
      await loadEvents();
    } catch (err) {
      console.error('Error creando evento', err);
      setError('No se pudo crear el evento. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId) => {
    const confirmed = window.confirm('¿Seguro que quieres eliminar este evento?');
    if (!confirmed) {
      return;
    }

    setDeletingId(eventId);
    try {
      await api.delete(`/api/events/${eventId}`);
      await loadEvents();
    } catch (err) {
      console.error('Error eliminando evento', err);
      setError('No se pudo eliminar el evento.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
      full: date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
    };
  };

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : `Zona ${zoneId}`;
  };

  // Ordenar eventos por fecha
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.event_date) - new Date(b.event_date)
  );

  if (loading) {
    return (
      <div>
        <div className="section-title">
          <div className="section-title-icon">📅</div>
          <div className="section-title-text">
            <h2>Planificador de Eventos</h2>
            <p>Cargando...</p>
          </div>
        </div>
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Cargando eventos y zonas...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">
        <div className="section-title-icon">📅</div>
        <div className="section-title-text">
          <h2>Planificador de Eventos</h2>
          <p>Gestiona los eventos programados</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
          <button
            type="button"
            onClick={() => setError('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              padding: '0 8px',
              marginLeft: '8px',
              cursor: 'pointer',
              width: 'auto'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulario de nuevo evento */}
      <div className="form-row">
        <div>
          <label>Nombre del evento</label>
          <input
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            placeholder="Ej: Concierto Sala Principal"
          />
        </div>
        <div>
          <label>Fecha del evento</label>
          <input
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div>
          <label>Zona asignada</label>
          <select
            value={selectedZone}
            onChange={(event) => setSelectedZone(event.target.value)}
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddEvent}
        disabled={saving}
        className="btn-success"
      >
        {saving ? (
          <>
            <span className="loading-spinner"></span>
            Guardando...
          </>
        ) : (
          <>
            <span>+</span>
            Agendar Evento
          </>
        )}
      </button>

      {/* Lista de eventos */}
      <div className="events-container">
        <div className="events-header">
          <h3>Eventos programados</h3>
          <span className="events-count">{events.length} eventos</span>
        </div>

        {sortedEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No hay eventos programados</h3>
            <p>Crea tu primer evento usando el formulario de arriba.</p>
          </div>
        ) : (
          <div className="events-list">
            {sortedEvents.map((eventItem) => {
              const dateInfo = formatEventDate(eventItem.event_date);
              const isDeleting = deletingId === eventItem.id;

              return (
                <div key={eventItem.id} className="event-item">
                  <div className="event-date-badge">
                    <div className="day">{dateInfo.day}</div>
                    <div className="month">{dateInfo.month}</div>
                  </div>
                  <div className="event-details">
                    <div className="event-name">{eventItem.event_name}</div>
                    <div className="event-zone">
                      📍 {getZoneName(eventItem.zone_id)} · {dateInfo.full}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-danger btn-small"
                    onClick={() => handleDelete(eventItem.id)}
                    disabled={isDeleting}
                    style={{ width: 'auto' }}
                  >
                    {isDeleting ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      '🗑'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
