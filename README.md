# 🚀 TransitKey: Live GPS Tracking System

The TransitKey Backend serves as the central hub for the platform’s live vehicle tracking system. It is responsible for managing the lifecycle of every trip—from initialization to completion—and ensuring that location data is synchronized across the entire network with minimal latency.Core Responsibilities:Real-time Relay: Orchestrates bidirectional communication between drivers and passengers using Socket.io Rooms. This ensures that GPS updates are only delivered to relevant participants, reducing server load and protecting user privacy.Spatial Persistence: Integrates with Supabase/PostGIS to store and query geographic coordinates. It converts raw GPS pings into database-optimized geography points using spatial functions like ST_SetSRID and ST_MakePoint.Trip Management: Manages trip states (scheduled, in-progress, completed) and handles the secure "handshake" required to begin live tracking.Security & Validation: Implements backend validation to ensure only authorized drivers can broadcast location data and that all incoming coordinates are formatted correctly for the frontend map.Key Performance Metrics:Low Latency: Optimized for sub-second delivery of GPS coordinates to connected map clients.Scalability: Room-based architecture allows for hundreds of simultaneous active trips without cross-talk or performance degradation. **React**, **Node.js**, **Socket.io**, and **Supabase (PostGIS)**.

---

## 📂 Project Structure

### 🛠 Backend (`/transitkey-backend`)
The engine handling API routes, database persistence, and WebSocket relay logic.
- **src/app.ts**: Server entry, CORS, and Socket.io Room logic.
- **src/config/supabase.ts**: Admin client for bypassing RLS via `service_role`.
- **src/controllers/location.controllers.ts**: Logic for `start`, `update`, and `get` location.
- **src/routes/location.routes.ts**: Endpoints for trip lifecycle and GPS pings.
- **src/services/location.service.ts**: PostGIS spatial queries (`ST_SetSRID`, `ST_MakePoint`).

### 💻 Frontend (`/transitkey-frontend`)
The React application for the map interface and driver tracking logic.
- **src/App.tsx**: Main Map interface, Socket listeners, and UI controls.
- **src/hooks/useGpsTracker.ts**: Custom hook managing `navigator.geolocation` and API pings.
- **src/hooks/useMapRecenter.ts**: Helper to keep the camera focused on the moving marker.
- **vite.config.ts**: Configured with `allowedHosts` for Dev Tunnel support.

---

## ⚙️ Setup & Installation

### 1. Database (Supabase)
Run the following in your Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
-- Grant access so the backend can update tables
GRANT ALL ON TABLE public.trips TO service_role;
GRANT ALL ON TABLE public.vehicle_locations TO service_role;
-- Disable RLS for testing if necessary
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
```

### 2. Backend Setup
1. `cd transitkey-backend`
2. `npm install`
3. Create `.env`:
   ```env
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   FRONTEND_URL=http://localhost:5173
   ```
4. `npm run dev` (Runs on Port 3000)

### 3. Frontend Setup
1. `cd transitkey-frontend`
2. `npm install`
3. Create `.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   ```
4. `npm run dev` (Runs on Port 5173)

---

## 📡 Real-Time Workflow (The "Handshake")
1. **Join**: On load, the Map joins a Socket.io **Room** using the `tripId`.
2. **Start**: "Start Trip" sends the initial GPS to the backend to set status to `in-progress`.
3. **Ping**: Every 5 seconds, the `useGpsTracker` hook pings the backend `/update` route.
4. **Relay**: The backend saves to DB and broadcasts ONLY to that specific Socket Room.
5. **Move**: The Map hears the update and moves the marker instantly.

---

## ⚠️ Demo Mode (Dev Tunnels)
When using VS Code Dev Tunnels:
- **Backend URL**: Use the public tunnel URL in the Frontend `.env`.
- **Allowed Hosts**: Update `vite.config.ts` with the Frontend tunnel URL.
- **CORS**: Ensure `app.ts` uses `origin: true` to accept tunnel requests.


transitkey-backend/
├── src/
│   ├── config/
│   │   └── supabase.ts          # Admin client for bypassing RLS
│   ├── controllers/
│   │   └── location.controllers.ts # Handlers for Start/Update/Get trip data
│   ├── middleware/
│   │   └── auth.middleware.ts   # Role-based access control (RBAC)
│   ├── routes/
│   │   ├── auth.routes.ts       # Auth & Cookie management
│   │   └── location.routes.ts   # Live GPS and trip lifecycle routes
│   ├── services/
│   │   └── location.service.ts  # PostGIS spatial queries & DB logic
│   └── app.ts                   # Main entry, CORS, & Socket.io Room logic
├── .env.example                 # Template for environment variables
├── package.json
└── tsconfig.json
