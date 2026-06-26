import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const httpServer = createServer(app);

// 🔥 MULTI-ORIGIN CORS WHITELIST FOR WEBSOCKET CONNECTIONS
const allowedOrigins = [
  "https://vercel.app", // Production Vercel web portal
  "http://localhost:5173",          // Local React development canvas
  "http://127.0.0.1:5173",          // Vite system loopback path
  "http://127.0.0.1:5500",          // Pure JS Local Live Server directory
  "http://localhost:5500"           // Alternative Live Server loopback mapping
];

// --- INITIALIZE SOCKET.IO WITH DYNAMIC CORS ORIGINS ---
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow internal connections or matching origins from the array matrix
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS Policy Violation: WebSocket origin unauthorized."));
      }
    },
    origin: [process.env.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5500" ],
    methods: ["GET", "POST"],
    credentials: true // Crucial to allow socket context cookie mapping verifications
  }
});

// Inject io into Express app to use in routes: req.app.get('socketio')
app.set('socketio', io);

// WEBSOCKET TELEMETRY LOGIC
io.on("connection", (socket: Socket) => {
  console.log("Socket Connected:", socket.id);

  socket.on("join-trip", (tripId: string) => {
    socket.join(tripId);
    console.log(`Client ${socket.id} joined Trip Room: ${tripId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// SAFE PARSING: Enforces a clean base-10 number layout mapping to clear Render build crashes
const PORT = parseInt(process.env.PORT || "3000", 10);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running cleanly on port: ${PORT}`);
});
