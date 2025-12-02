import express, { json, urlencoded } from "express";
import cors from 'cors';
import corsMiddleware from "./Services/API/Middlewares/Cors.js";
import errorMiddleware from "./Services/API/Middlewares/ErrorHandler.js";
import requestTrackingMiddleware from "./Services/API/Middlewares/RequestTracking.js";
// import userAuthMiddleware from "./Services/API/Middlewares/UserAuthentication.js";
import LocalEnvVars from "./Shared/Common/Models/LocalEnvVars.js"; 
import accountRouter from "./Services/API/Routes/Account.js";
import baseRouter from "./Services/API/Routes/Base.js";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

// Load keys from files
const privateKeyPath = process.env.JWT_SECRET_PATH || './private_key.pem';
const publicKeyPath = process.env.JWT_SECRET_PUBLIC_PATH || './public_key.pem';

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

LocalEnvVars.initialize(privateKey, publicKey);


export default function buildApp() {
    const app = express();


    // Basic Middleware setup
    app.use(urlencoded({ extended: true }));
    app.use(json());
    // Add this line
    

    // Track request
    app.use(requestTrackingMiddleware);

    // CORS: allow your frontend origins
    app.use(corsMiddleware);
    // Middlewarehttps://smartmeter-vjratechnologies.web.app/
    app.use(cors({
    origin: ['https://smartmeter-vjratechnologies.web.app/', 'http://localhost:3000'],
    credentials: true
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use("/api/v1/account", accountRouter);
    app.use('/api/account', accountRouter); 
    // app.use("/api/v1/auth", authRouter);
    // app.use("/api/v1/user", userAuthMiddleware, userRouter);
    app.use("/api/v1", baseRouter);
    app.use('/api', baseRouter);
    
    app.use("", baseRouter);


    app.use(errorMiddleware);

    

  

    // ✅ ADD THESE - AFTER app.use(errorMiddleware);
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // DON'T exit - keep server alive!
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', promise, 'reason:', reason);
  // DON'T exit - keep server alive!
});
  return app; // The app instance

}
