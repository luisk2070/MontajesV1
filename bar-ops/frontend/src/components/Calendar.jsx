import { useState } from 'react';

// Calendario básico con bloques de trabajo en estado local
const Calendar = () => {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [events, setEvents] = useState([]);

  const handleAddEvent = () => {
    if (!eventName || !eventDate) {
      return;
    }

    const newEvent = {
      id: Date.now(),
      name: eventName,
      date: eventDate
    };

    console.log('📅 Evento agregado', newEvent);
    setEvents((prev) => [...prev, newEvent]);
    setEventName('');
    setEventDate('');
  };

  return (
    <div>
      <h2 className="section-title">Módulo D · Planificador Calendario</h2>
      <label>Nombre del evento</label>
      <input value={eventName} onChange={(event) => setEventName(event.target.value)} />

      <label>Fecha del evento</label>
      <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />

      <button type="button" onClick={handleAddEvent}>AGENDAR</button>

      <ul className="list">
        {events.map((event) => (
          <li key={event.id}>
            <strong>{event.name}</strong> · {event.date}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Calendar;
