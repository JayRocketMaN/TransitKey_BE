import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const httpServer = createServer(app);

// --- INITIALIZE SOCKET.IO ---
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Inject io into Express app to use in routes: req.app.get('socketio')
app.set('socketio', io);

//SOCKET LOGIC
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

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
