import express, { json, urlencoded } from "express";
import cors from 'cors';
import corsMiddleware from "./Services/API/Middlewares/Cors.js";
import errorMiddleware from "./Services/API/Middlewares/ErrorHandler.js";
import requestTrackingMiddleware from "./Services/API/Middlewares/RequestTracking.js";
import userAuthMiddleware from "./Services/API/Middlewares/UserAuthentication.js";
import LocalEnvVars from "./Shared/Common/Models/LocalEnvVars.js"; 
import accountRouter from "./Services/API/Routes/Account.js";
import baseRouter from "./Services/API/Routes/Base.js";
import userRouter from "./Services/API/Routes/User.js";
import supportRoutes from "./Services/API/Routes/Support.js";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// dotenv.config();

// Load keys from files
const privateKeyPath = process.env.JWT_SECRET_PATH || './keys/private_key.pem';
const publicKeyPath = process.env.JWT_SECRET_PUBLIC_PATH || './keys/public_key.pem';

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

LocalEnvVars.initialize(privateKey, publicKey);


export default function buildApp() {
  const app = express();

  // ✅ MOVE CORS TO THE TOP (before any other middleware)
  app.use(cors({
    origin: [
      'http://127.0.0.1:3000',
      'http://https://smartmeter-vjratechnologies.web.app',
      'http://https://smartmeter-vjratechnologies.web.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Basic Middleware setup (AFTER CORS)
  app.use(urlencoded({ extended: true }));
  app.use(json());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Track request
  app.use(requestTrackingMiddleware);

  // ❌ REMOVE OR COMMENT OUT the custom corsMiddleware line
  // app.use(corsMiddleware);  // ← Delete this or comment it out

// Routes
app.use("/api/v1/account", accountRouter);
app.use('/api/account', accountRouter);
app.use("/api/v1/user", userAuthMiddleware, userRouter);

// 🔹 Mount support routes BEFORE generic /api baseRouter
app.use('/api/support', userAuthMiddleware, supportRoutes);

app.use("/api/v1", baseRouter);
app.use('/api', baseRouter);
app.use("", baseRouter);



  // Error handling (at the end)
  app.use(errorMiddleware);

  // Unhandled errors
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', promise, 'reason:', reason);
  });

  return app;
}
