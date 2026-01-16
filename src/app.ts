import express, { json, urlencoded } from "express";
import corsMiddleware from "./Services/API/Middlewares/Cors.js";
import errorMiddleware from "./Services/API/Middlewares/ErrorHandler.js";
import requestTrackingMiddleware from "./Services/API/Middlewares/RequestTracking.js";
import userAuthMiddleware from "./Services/API/Middlewares/UserAuthentication.js";
import accountRouter from "./Services/API/Routes/Account.js";
import authRouter from "./Services/API/Routes/Auth.js";
import baseRouter from "./Services/API/Routes/Base.js";
import paymentRouter from "./Services/API/Routes/Payment.js";
import supportRoutes from "./Services/API/Routes/Support.js";
import userRouter from "./Services/API/Routes/User.js";
export default function buildApp() {
  const app = express();

  // Basic Middleware setup
  app.use(urlencoded({ extended: true }));
  app.use(json());

  // Track request
  app.use(requestTrackingMiddleware);

  // CORS: allow your frontend origins


// ✅ COMPLETE CORS SETUP
app.use(corsMiddleware);

// ✅ Explicit OPTIONS handler (backup)
app.options('*', corsMiddleware);

// ✅ Body parsers AFTER CORS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


  app.use("/api/v1/account", accountRouter);
  app.use("/api/account", accountRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/payment", paymentRouter);
  app.use('/api/support', userAuthMiddleware, supportRoutes);
  app.use("/api/v1/user", userAuthMiddleware, userRouter);
  app.use("/api/v1", baseRouter);

  app.use("", baseRouter);
  // TODO: redirect to home (or login) for anything didn't match above

  app.use(errorMiddleware);

  return app; // The app instance
}