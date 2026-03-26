# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DCIM Pro is a full-stack Data Center Infrastructure Management application (similar to Nlyte/Sunbird). It manages the full hierarchy of data center infrastructure: Data Centers → Rooms → Rows → Racks → Devices, with power, cooling, cabling, monitoring, and reporting.

## Development Commands

### Start Both Servers (Windows)
```batch
start_dev.bat
```

### Backend (Django)
```bash
cd backend
venv/Scripts/activate          # Windows
source venv/bin/activate       # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data     # Populate demo data (admin/admin123)
python manage.py runserver     # http://localhost:8000
```

### Frontend (React)
```bash
cd frontend
npm run dev      # http://localhost:5173
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Docker (Production)
```bash
docker-compose up -d
```

### Useful Django Commands
```bash
python manage.py shell                    # Django shell
python manage.py makemigrations <app>    # After changing models
python manage.py migrate
python manage.py seed_data               # Re-seed demo data
```

## Architecture

### Backend (`backend/`)
- **Settings:** `dcim/settings/base.py`, `development.py` (SQLite), `production.py` (PostgreSQL)
- **Django apps:** `apps/users`, `apps/locations`, `apps/assets`, `apps/power`, `apps/cooling`, `apps/cables`, `apps/monitoring`, `apps/reports`
- **API root:** `dcim/urls.py` — all routes under `/api/`
- **API docs:** `/api/docs/` (drf-spectacular Swagger UI)
- **Auth:** JWT via simplejwt — 8-hour access token, 7-day refresh token
- **Real-time:** Django Channels + Redis for WebSocket alerts/metrics
- **Async tasks:** Celery + Redis

### Frontend (`frontend/src/`)
- **Routing:** `App.tsx` — React Router v7 with `ProtectedRoute` wrapping all authenticated pages
- **API client:** `api/client.ts` (Axios with JWT interceptor + auto-refresh on 401), `api/index.ts` (typed endpoint factories using a `createCRUD<T>()` pattern)
- **State:** Zustand — `store/authStore.ts` (auth + user), `store/uiStore.ts` (sidebar)
- **Data fetching:** TanStack React Query with `staleTime: 30_000`
- **Visualizations:** Three.js + react-three/fiber for 3D floor plans; react-konva for 2D floor plans; Recharts for dashboards
- **Styling:** Tailwind CSS v3 — **do not upgrade to v4**, it breaks `@apply` with custom colors. PostCSS config uses `tailwindcss: {}` (not `@tailwindcss/postcss`).

### Data Model Hierarchy
```
DataCenter
  └── Room (server | network | IDF | MDF | colocation | mixed)
       └── Row (orientation: horizontal | vertical)
            └── Rack (u_height, power_capacity, weight_capacity)
                 └── Device (position_u, status, device_type → Manufacturer)
                      └── Interface (type: 1GE | 10GE | SFP | fiber | console | mgmt | power)
```

**Power:** `PowerPanel → PowerFeed → PDU → PowerOutlet`
**Cooling:** `CoolingUnit`, `TemperatureSensor` (linked to Room or Rack)
**Cables:** `Cable`, `PatchPanel`
**Monitoring:** `Alert`, `Metric` (time-series)
**Users:** Custom `User` model with roles (`admin | engineer | viewer | operator`), `AuditLog` tracks all mutations.

### API Patterns
All DRF viewsets follow standard REST conventions. The frontend uses a generic CRUD factory:
```typescript
createCRUD<T>(endpoint)  // returns { list, listAll, get, create, update, delete }
```
`listAll()` fetches with `page_size=1000` to bypass pagination when needed.

Custom actions (non-CRUD): `dataCenterApi.stats(id)`, `dataCenterApi.floorPlan(id)`, `alertApi.acknowledge(id)`, `alertApi.resolve(id)`, `reportsApi.dashboard/capacity/power/temperature()`

### Vite Proxy
During development, Vite proxies `/api/*` and `/media/*` to `http://localhost:8000`, so the frontend never needs to include the backend host in fetch calls.

## Key Credentials (Demo)
- **Login:** `admin` / `admin123`
- **API docs:** http://localhost:8000/api/docs/
- **Frontend:** http://localhost:5173
