import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mainRoutes from './routes/index.routes.js'; 

dotenv.config();

const app: Application = express();

//GLOBAL LOGGER
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

//MIDDLEWARE & CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://vercel.app", // Fixed: Added https://
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

//ALL CONVERTED ROUTES
app.use('/api', mainRoutes);

//404 HANDLER
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
