import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// CORS seguro para producción y flexible en local
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origen no permitido por CORS'));
  }
}));
app.use(express.json());

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Obtener zonas
app.get('/api/zones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM zones ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error cargando zonas', error);
    res.status(500).json({ error: 'Error cargando zonas' });
  }
});

// Obtener accesorios
app.get('/api/accessories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accessories ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error cargando accesorios', error);
    res.status(500).json({ error: 'Error cargando accesorios' });
  }
});

// Calcular tiempos de montaje
app.post('/api/calculate', async (req, res) => {
  try {
    const { modules = [], accessories = [], zone_id, module_count } = req.body;
    console.log('📥 /api/calculate payload', req.body);

    const moduleCount = Number.isInteger(module_count)
      ? module_count
      : Array.isArray(modules)
        ? modules.length
        : 0;

    const cornerCount = 2; // Esquineros fijos por diseño base de barra
    const totalUnits = moduleCount + cornerCount;

    const moduleResult = await pool.query(
      "SELECT name, base_minutes FROM bar_modules WHERE name IN ('Módulo estándar', 'Esquinero')"
    );

    const moduleMap = moduleResult.rows.reduce((acc, row) => {
      acc[row.name] = row.base_minutes;
      return acc;
    }, {});

    const moduleBase = moduleMap['Módulo estándar'] ?? 12;
    const cornerBase = moduleMap['Esquinero'] ?? 8;

    const moduleMinutes = (moduleCount * moduleBase) + (cornerCount * cornerBase);
    const unionMinutes = Math.max(totalUnits - 1, 0) * 5; // N-1 uniones

    let accessoriesMinutes = 0;
    if (accessories.length > 0) {
      const accessoryIds = accessories.filter((id) => Number.isInteger(id));
      if (accessoryIds.length > 0) {
        const accessoryResult = await pool.query(
          'SELECT SUM(extra_minutes) AS total FROM accessories WHERE id = ANY($1::int[])',
          [accessoryIds]
        );
        accessoriesMinutes = Number(accessoryResult.rows[0]?.total || 0);
      }
    }

    const zoneResult = await pool.query('SELECT travel_minutes, name FROM zones WHERE id = $1', [zone_id]);
    const zoneMinutes = Number(zoneResult.rows[0]?.travel_minutes || 0);
    const zoneName = zoneResult.rows[0]?.name || 'Zona desconocida';

    const stockMinutes = 10; // Tiempo base de llenado de stock

    const totalTimeMinutes = moduleMinutes + unionMinutes + accessoriesMinutes + zoneMinutes + stockMinutes;

    res.json({
      total_time_minutes: totalTimeMinutes,
      breakdown: {
        transporte: zoneMinutes,
        montaje_modulos: moduleMinutes,
        montaje_uniones: unionMinutes,
        accesorios: accessoriesMinutes,
        llenado_stock: stockMinutes,
        zona: zoneName
      }
    });
  } catch (error) {
    console.error('❌ Error en /api/calculate', error);
    res.status(500).json({ error: 'Error calculando tiempos' });
  }
});

// Calcular costes de personal
app.post('/api/cost-calculate', async (req, res) => {
  try {
    const { required_hours = 0, event_date } = req.body;
    console.log('📥 /api/cost-calculate payload', req.body);

    const totalFixedResult = await pool.query('SELECT SUM(monthly_hours) AS total FROM staff');
    const totalFixedHours = Number(totalFixedResult.rows[0]?.total || 0);

    const assignedResult = await pool.query(
      `SELECT COALESCE(SUM(required_hours), 0) AS total
       FROM events
       WHERE date_trunc('month', event_date) = date_trunc('month', $1::date)`
      , [event_date]
    );

    const assignedHours = Number(assignedResult.rows[0]?.total || 0);
    const remainingCapacity = Math.max(totalFixedHours - assignedHours, 0);

    const requiredHoursNumber = Number(required_hours) || 0;
    const canUseFixed = requiredHoursNumber <= remainingCapacity;

    const ettHours = Math.max(requiredHoursNumber - remainingCapacity, 0);
    const ettRate = 18; // € por hora estimada para ETT
    const ettCost = ettHours * ettRate;

    const ruleFourHoursRecommendation = requiredHoursNumber <= 4
      ? 'Recomendación: retener camareros para desmontaje (<=4h).'
      : 'Recomendación: valorar mozos externos para desmontaje (>4h).';

    res.json({
      can_use_fixed: canUseFixed,
      remaining_capacity: remainingCapacity,
      required_hours: requiredHoursNumber,
      ett_hours: ettHours,
      ett_cost: ettCost,
      rule_four_hours: ruleFourHoursRecommendation
    });
  } catch (error) {
    console.error('❌ Error en /api/cost-calculate', error);
    res.status(500).json({ error: 'Error calculando costes' });
  }
});

// CRUD básico de eventos
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY event_date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error listando eventos', error);
    res.status(500).json({ error: 'Error listando eventos' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { event_name, event_date, zone_id, required_hours = 0, bar_config } = req.body;
    console.log('📥 /api/events create', req.body);

    const result = await pool.query(
      `INSERT INTO events (event_name, event_date, zone_id, required_hours, bar_config)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [event_name, event_date, zone_id, required_hours, bar_config]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error creando evento', error);
    res.status(500).json({ error: 'Error creando evento' });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { event_name, event_date, zone_id, required_hours = 0, bar_config } = req.body;
    console.log('📥 /api/events update', req.body);

    const result = await pool.query(
      `UPDATE events
       SET event_name = $1,
           event_date = $2,
           zone_id = $3,
           required_hours = $4,
           bar_config = $5
       WHERE id = $6
       RETURNING *`,
      [event_name, event_date, zone_id, required_hours, bar_config, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error actualizando evento', error);
    res.status(500).json({ error: 'Error actualizando evento' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📥 /api/events delete', id);

    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ status: 'deleted' });
  } catch (error) {
    console.error('❌ Error eliminando evento', error);
    res.status(500).json({ error: 'Error eliminando evento' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Bar-Ops corriendo en puerto ${PORT}`);
});
