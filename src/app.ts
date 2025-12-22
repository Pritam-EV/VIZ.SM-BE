import express, { json, urlencoded } from "express";
import cors from 'cors';
import errorMiddleware from "./Services/API/Middlewares/ErrorHandler.js";
import requestTrackingMiddleware from "./Services/API/Middlewares/RequestTracking.js";
import userAuthMiddleware from "./Services/API/Middlewares/UserAuthentication.js";
import LocalEnvVars from "./Shared/Common/Models/LocalEnvVars.js"; 
import accountRouter from "./Services/API/Routes/Account.js";
import baseRouter from "./Services/API/Routes/Base.js";
import authRouter from "./Services/API/Routes/Auth.js";
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

  // ✅ CORS — SINGLE SOURCE OF TRUTH
  app.use(cors({
    origin: [
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'https://smartmeter-vjratechnologies.web.app',
      'https://smeter.vjratechnologies.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));



  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Track request
  app.use(requestTrackingMiddleware);

  // Routes
  app.use("/api/v1/account", accountRouter);
  app.use("/api/account", accountRouter);

  app.use("/api/v1/auth", authRouter);

  app.use("/api/v1/user", userAuthMiddleware, userRouter);

  app.use('/api/support', userAuthMiddleware, supportRoutes);

  app.use("/api/v1", baseRouter);
  app.use("/api", baseRouter);
  app.use("", baseRouter);

  // Error handling
  app.use(errorMiddleware);

  return app;
}

