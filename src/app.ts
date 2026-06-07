import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import locationRoutes from './routes/location.routes.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Use .env variable for CORS in production, fallback to local for now
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// --- 1. GLOBAL LOGGER ---
app.use((req, res, next) => {
  console.log(`📡 Incoming Request: ${req.method} ${req.url}`);
  next();
});

// --- 2. UPDATED CORS CONFIGURATION ---
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// --- 3. INITIALIZE SOCKET.IO ---
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('socketio', io);

// --- 4. MIDDLEWARE ---
app.use(cookieParser(process.env.COOKIE_SECRET)); 
app.use(express.json());

// --- 5. ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);

// --- 6. SOCKET LOGIC (ROOMS INTEGRATED) ---
io.on("connection", (socket) => {
  console.log("✅ Socket Connected:", socket.id);

  // New: Handle Room Joining
  socket.on("join-trip", (tripId: string) => {
    socket.join(tripId);
    console.log(`👥 Client ${socket.id} joined Trip Room: ${tripId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
