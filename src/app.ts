import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mainRoutes from './routes/index.routes.js'; 

dotenv.config();

const app: Application = express();

// GLOBAL LOGGER
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

// 🔥 MULTI-ORIGIN CORS WHITELIST MATRIX
const allowedOrigins = [
  "https://vercel.app", // Production layout hosted workspace portal on Vercel
  "http://localhost:5173",          // Local React development platform engine container
  "http://127.0.0.1:5173",          // Alternative loopback coordinate matching vector path
  "http://127.0.0.1:5500",          // Local Live Server container mapping for your pure JS shell folder
  "http://localhost:5500"           // Fallback loopback address space for live servers
];

// MIDDLEWARE & CORS CONFIGURATION
app.use(cors({
  origin: (origin, callback) => {
    // Grant execution entries to local server requests or explicitly matched system origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS Policy Violation: Origin signature unauthorized by cluster."));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true, // Absolute rule allows HttpOnly tracking session cookies to pass safely across folders
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"] // Explicitly registers cookie transmission lines
}));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

// ALL CONVERTED ROUTES NEXUS
app.use('/api', mainRoutes);

// 404 HANDLER
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
