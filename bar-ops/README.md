# Bar-Ops · Sistema Operativo de Barras Móviles (Roig Arena)

## Requisitos
- Node.js 18+
- PostgreSQL

## Configuración local rápida
```bash
git clone <TU_REPO>
cd bar-ops
```

### Backend
```bash
cd backend
cp .env.example .env
# Ajusta DATABASE_URL en .env
npm install
npm run dev
```

### Frontend
```bash
cd ../frontend
npm install
npm run dev
```

## Despliegue en Render (solo capa gratuita)

### 1. Crear PostgreSQL Free
1. En Render Dashboard → **New** → **PostgreSQL**.
2. Plan: **Free**.
3. Crea la base de datos y copia el `Internal Database URL`.

### 2. Ejecutar SQL inicial
1. En Render DB → **Connect** → **PSQL Shell**.
2. Pega el contenido de `backend/database.sql` y ejecuta.

### 3. Crear Web Service (Backend)
1. Dashboard → **New** → **Web Service**.
2. Conecta tu repo y selecciona la carpeta `bar-ops/backend`.
3. Build Command:
   ```bash
   npm install
   ```
4. Start Command:
   ```bash
   npm start
   ```
5. Env Vars:
   - `DATABASE_URL` = (Internal Database URL)
   - `PORT` = `10000`
   - `NODE_ENV` = `production`

### 4. Crear Static Site (Frontend)
1. Dashboard → **New** → **Static Site**.
2. Root Directory: `bar-ops/frontend`.
3. Build Command:
   ```bash
   npm install && npm run build
   ```
4. Publish Directory:
   ```
   dist
   ```
5. Edita `frontend/src/api.js` y sustituye `https://TU-BACKEND.onrender.com` por la URL real del backend.

## Flujo de negocio resumido
- Configura módulos + accesorios + zona → tiempos totales.
- Calcula capacidad fija y desborde ETT por mes.
- Planifica eventos en calendario básico.

## Exportación JSON para Calendar
Puedes usar los datos guardados en `/api/events` para generar un JSON compatible con Google Calendar.

