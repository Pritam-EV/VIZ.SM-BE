import express, { json, urlencoded } from "express";
import cors from 'cors';
import corsMiddleware from "./Services/API/Middlewares/Cors.js";
import errorMiddleware from "./Services/API/Middlewares/ErrorHandler.js";
import requestTrackingMiddleware from "./Services/API/Middlewares/RequestTracking.js";
// import userAuthMiddleware from "./Services/API/Middlewares/UserAuthentication.js";
import accountRouter from "./Services/API/Routes/Account.js";
import baseRouter from "./Services/API/Routes/Base.js";
import dotenv from 'dotenv';
dotenv.config();

export default function buildApp() {
    const app = express();

    // Basic Middleware setup
    app.use(urlencoded({ extended: true }));
    app.use(json());
    // Add this line
    app.use('/api/account', require('./Services/API/Routes/Account'));

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
    // TODO: redirect to home (or login) for anything didn't match above

    app.use(errorMiddleware);

    return app; // The app instance
}