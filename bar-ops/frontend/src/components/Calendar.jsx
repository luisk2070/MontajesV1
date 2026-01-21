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

  const loadEvents = async () => {
    try {
      console.log('📥 Cargando eventos');
      const response = await api.get('/api/events');
      setEvents(response.data);
    } catch (err) {
      console.error('❌ Error cargando eventos', err);
      setError('No se pudieron cargar los eventos.');
    }
  };

  const loadZones = async () => {
    try {
      const response = await api.get('/api/zones');
      setZones(response.data);
      setSelectedZone(response.data[0]?.id || '');
    } catch (err) {
      console.error('❌ Error cargando zonas', err);
      setError('No se pudieron cargar las zonas.');
    }
  };

  useEffect(() => {
    loadZones();
    loadEvents();
  }, []);

  const handleAddEvent = async () => {
    if (!eventName || !eventDate || !selectedZone) {
      setError('Completa nombre, fecha y zona.');
      return;
    }

    try {
      setError('');
      const payload = {
        event_name: eventName,
        event_date: eventDate,
        zone_id: Number(selectedZone),
        required_hours: 0,
        bar_config: {
          source: 'calendar'
        }
      };

      console.log('📤 Creando evento', payload);
      await api.post('/api/events', payload);
      setEventName('');
      setEventDate('');
      await loadEvents();
    } catch (err) {
      console.error('❌ Error creando evento', err);
      setError('No se pudo crear el evento.');
    }
  };

  const handleDelete = async (eventId) => {
    const confirmed = window.confirm('¿Seguro que quieres eliminar el evento?');
    if (!confirmed) {
      return;
    }

    try {
      console.log('🗑️ Eliminando evento', eventId);
      await api.delete(`/api/events/${eventId}`);
      await loadEvents();
    } catch (err) {
      console.error('❌ Error eliminando evento', err);
      setError('No se pudo eliminar el evento.');
    }
  };

  return (
    <div>
      <h2 className="section-title">Módulo D · Planificador Calendario</h2>
      <label>Nombre del evento</label>
      <input value={eventName} onChange={(event) => setEventName(event.target.value)} />

      <label>Fecha del evento</label>
      <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />

      <label>Zona asignada</label>
      <select value={selectedZone} onChange={(event) => setSelectedZone(event.target.value)}>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name}
          </option>
        ))}
      </select>

      <button type="button" onClick={handleAddEvent}>AGENDAR</button>

      {error && <div className="alert">{error}</div>}

      <ul className="list">
        {events.map((eventItem) => (
          <li key={eventItem.id}>
            <strong>{eventItem.event_name}</strong> · {eventItem.event_date}
            {eventItem.zone_id && (
              <span> · Zona #{eventItem.zone_id}</span>
            )}
            <button type="button" onClick={() => handleDelete(eventItem.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Calendar;
