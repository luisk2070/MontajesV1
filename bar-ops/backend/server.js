import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ============================================
// CONFIGURACIÓN EXTERNALIZADA
// Valores por defecto que pueden sobrescribirse
// con variables de entorno
// ============================================
const CONFIG = {
  // Tiempos de montaje (minutos)
  STOCK_MINUTES: Number(process.env.STOCK_MINUTES) || 10,
  UNION_MINUTES: Number(process.env.UNION_MINUTES) || 5,
  CORNER_COUNT: Number(process.env.CORNER_COUNT) || 2,
  MODULE_BASE_FALLBACK: Number(process.env.MODULE_BASE_FALLBACK) || 12,
  CORNER_BASE_FALLBACK: Number(process.env.CORNER_BASE_FALLBACK) || 8,

  // Costes de personal
  ETT_RATE: Number(process.env.ETT_RATE) || 18,
  FOUR_HOURS_THRESHOLD: Number(process.env.FOUR_HOURS_THRESHOLD) || 4,

  // Optimización de staff
  MIN_STAFF: Number(process.env.MIN_STAFF) || 1,
  MAX_STAFF: Number(process.env.MAX_STAFF) || 20,
  EFFICIENCY_FACTOR: Number(process.env.EFFICIENCY_FACTOR) || 0.85, // Factor de eficiencia al añadir más personal
};

// CORS seguro para producción y flexible en local
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej: curl, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }
    // Permitir orígenes en la lista
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    // Permitir cualquier subdominio de onrender.com (para Render deployments)
    if (origin.endsWith('.onrender.com')) {
      callback(null, true);
      return;
    }
    // Permitir localhost en cualquier puerto (desarrollo)
    if (origin.startsWith('http://localhost:')) {
      callback(null, true);
      return;
    }
    callback(new Error('Origen no permitido por CORS'));
  }
}));
app.use(express.json());

// ============================================
// ENDPOINTS DE CONFIGURACIÓN
// ============================================

// Endpoint de salud (con warm-up de BD)
app.get('/api/health', async (req, res) => {
  try {
    // Hacer una query simple para "despertar" la BD si está dormida
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('❌ Error en health check', error);
    res.json({ status: 'ok', database: 'disconnected' });
  }
});

// Obtener configuración actual (útil para debugging y UI)
app.get('/api/settings', (req, res) => {
  res.json({
    stock_minutes: CONFIG.STOCK_MINUTES,
    union_minutes: CONFIG.UNION_MINUTES,
    corner_count: CONFIG.CORNER_COUNT,
    ett_rate: CONFIG.ETT_RATE,
    four_hours_threshold: CONFIG.FOUR_HOURS_THRESHOLD,
    min_staff: CONFIG.MIN_STAFF,
    max_staff: CONFIG.MAX_STAFF,
    efficiency_factor: CONFIG.EFFICIENCY_FACTOR
  });
});

// ============================================
// ENDPOINTS DE DATOS
// ============================================

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

// ============================================
// CÁLCULO DE TIEMPOS DE MONTAJE
// ============================================

// Función auxiliar para calcular tiempo base
async function calculateBaseTime(moduleCount, accessories, zoneId) {
  const cornerCount = CONFIG.CORNER_COUNT;
  const totalUnits = moduleCount + cornerCount;

  // Obtener tiempos de módulos de la BD
  const moduleResult = await pool.query(
    "SELECT name, base_minutes FROM bar_modules WHERE name IN ('Módulo estándar', 'Esquinero')"
  );

  const moduleMap = moduleResult.rows.reduce((acc, row) => {
    acc[row.name] = row.base_minutes;
    return acc;
  }, {});

  const moduleBase = moduleMap['Módulo estándar'] ?? CONFIG.MODULE_BASE_FALLBACK;
  const cornerBase = moduleMap['Esquinero'] ?? CONFIG.CORNER_BASE_FALLBACK;

  const moduleMinutes = (moduleCount * moduleBase) + (cornerCount * cornerBase);
  const unionMinutes = Math.max(totalUnits - 1, 0) * CONFIG.UNION_MINUTES;

  // Calcular tiempo de accesorios
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

  // Obtener tiempo de zona
  const zoneResult = await pool.query('SELECT travel_minutes, name FROM zones WHERE id = $1', [zoneId]);
  const zoneMinutes = Number(zoneResult.rows[0]?.travel_minutes || 0);
  const zoneName = zoneResult.rows[0]?.name || 'Zona desconocida';

  return {
    moduleMinutes,
    unionMinutes,
    accessoriesMinutes,
    zoneMinutes,
    zoneName,
    stockMinutes: CONFIG.STOCK_MINUTES,
    totalMinutes: moduleMinutes + unionMinutes + accessoriesMinutes + zoneMinutes + CONFIG.STOCK_MINUTES
  };
}

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

    const timeData = await calculateBaseTime(moduleCount, accessories, zone_id);

    res.json({
      total_time_minutes: timeData.totalMinutes,
      breakdown: {
        transporte: timeData.zoneMinutes,
        montaje_modulos: timeData.moduleMinutes,
        montaje_uniones: timeData.unionMinutes,
        accesorios: timeData.accessoriesMinutes,
        llenado_stock: timeData.stockMinutes,
        zona: timeData.zoneName
      }
    });
  } catch (error) {
    console.error('❌ Error en /api/calculate', error);
    res.status(500).json({ error: 'Error calculando tiempos' });
  }
});

// ============================================
// OPTIMIZACIÓN DE STAFF
// ============================================

// Calcular el número óptimo de personal para un tiempo límite
app.post('/api/optimize-staff', async (req, res) => {
  try {
    const {
      modules = [],
      accessories = [],
      zone_id,
      module_count,
      target_time_minutes
    } = req.body;

    console.log('📥 /api/optimize-staff payload', req.body);

    if (!target_time_minutes || target_time_minutes <= 0) {
      return res.status(400).json({
        error: 'Se requiere un tiempo objetivo válido (target_time_minutes)'
      });
    }

    const moduleCount = Number.isInteger(module_count)
      ? module_count
      : Array.isArray(modules)
        ? modules.length
        : 0;

    const timeData = await calculateBaseTime(moduleCount, accessories, zone_id);
    const baseTime = timeData.totalMinutes;

    // Si el tiempo base ya cumple el objetivo con 1 persona
    if (baseTime <= target_time_minutes) {
      return res.json({
        optimal_staff: 1,
        estimated_time_minutes: baseTime,
        target_time_minutes: target_time_minutes,
        base_time_minutes: baseTime,
        meets_target: true,
        savings_minutes: target_time_minutes - baseTime,
        breakdown: {
          transporte: timeData.zoneMinutes,
          montaje_modulos: timeData.moduleMinutes,
          montaje_uniones: timeData.unionMinutes,
          accesorios: timeData.accessoriesMinutes,
          llenado_stock: timeData.stockMinutes
        }
      });
    }

    // Iterar incrementando staff hasta encontrar el óptimo
    // El tiempo se reduce según: tiempo_ajustado = tiempo_base / (staff * factor_eficiencia)
    // Nota: transporte y stock no se dividen (son tiempos fijos)
    const fixedTime = timeData.zoneMinutes + timeData.stockMinutes;
    const variableTime = timeData.moduleMinutes + timeData.unionMinutes + timeData.accessoriesMinutes;

    let optimalStaff = 1;
    let estimatedTime = baseTime;
    let meetsTarget = false;

    for (let staff = CONFIG.MIN_STAFF; staff <= CONFIG.MAX_STAFF; staff++) {
      // Aplicar factor de eficiencia decreciente con más personal
      const efficiencyMultiplier = Math.pow(CONFIG.EFFICIENCY_FACTOR, staff - 1);
      const adjustedVariableTime = variableTime / (staff * efficiencyMultiplier);
      const totalAdjustedTime = fixedTime + adjustedVariableTime;

      if (totalAdjustedTime <= target_time_minutes) {
        optimalStaff = staff;
        estimatedTime = Math.round(totalAdjustedTime);
        meetsTarget = true;
        break;
      }

      optimalStaff = staff;
      estimatedTime = Math.round(totalAdjustedTime);
    }

    res.json({
      optimal_staff: optimalStaff,
      estimated_time_minutes: estimatedTime,
      target_time_minutes: target_time_minutes,
      base_time_minutes: baseTime,
      meets_target: meetsTarget,
      savings_minutes: meetsTarget ? target_time_minutes - estimatedTime : 0,
      efficiency_factor: CONFIG.EFFICIENCY_FACTOR,
      max_staff_checked: CONFIG.MAX_STAFF,
      breakdown: {
        fixed_time: fixedTime,
        variable_time: variableTime,
        transporte: timeData.zoneMinutes,
        montaje_modulos: timeData.moduleMinutes,
        montaje_uniones: timeData.unionMinutes,
        accesorios: timeData.accessoriesMinutes,
        llenado_stock: timeData.stockMinutes
      }
    });
  } catch (error) {
    console.error('❌ Error en /api/optimize-staff', error);
    res.status(500).json({ error: 'Error calculando optimización de staff' });
  }
});

// ============================================
// CÁLCULO DE COSTES DE PERSONAL
// ============================================

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
    const ettCost = ettHours * CONFIG.ETT_RATE;

    const ruleFourHoursRecommendation = requiredHoursNumber <= CONFIG.FOUR_HOURS_THRESHOLD
      ? `Recomendación: retener camareros para desmontaje (<=${CONFIG.FOUR_HOURS_THRESHOLD}h).`
      : `Recomendación: valorar mozos externos para desmontaje (>${CONFIG.FOUR_HOURS_THRESHOLD}h).`;

    res.json({
      can_use_fixed: canUseFixed,
      remaining_capacity: remainingCapacity,
      required_hours: requiredHoursNumber,
      ett_hours: ettHours,
      ett_cost: ettCost,
      ett_rate: CONFIG.ETT_RATE,
      rule_four_hours: ruleFourHoursRecommendation
    });
  } catch (error) {
    console.error('❌ Error en /api/cost-calculate', error);
    res.status(500).json({ error: 'Error calculando costes' });
  }
});

// ============================================
// CRUD DE EVENTOS
// ============================================

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
  console.log('📋 Configuración cargada:', CONFIG);
});
