import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mainRoutes from './routes/index.routes.js'; // The new central hub

dotenv.config();

const app: Application = express();

// --- 1. GLOBAL LOGGER ---
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📡 Incoming Request: ${req.method} ${req.url}`);
  next();
});

// --- 2. MIDDLEWARE & CORS ---
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

// --- 3. ALL CONVERTED ROUTES ---
// This now covers /api/auth, /api/parks, /api/vehicles, etc.
app.use('/api', mainRoutes);

// --- 4. 404 HANDLER ---
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
