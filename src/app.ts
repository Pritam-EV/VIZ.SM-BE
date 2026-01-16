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

  // ✅ 1. BODY PARSERS FIRST (req.body works everywhere)
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(json({ limit: '10mb' }));

  // ✅ 2. CORS SECOND (before custom middleware)
  app.use(corsMiddleware);
  
  // ✅ 3. OPTIONS wildcard (fixed ✅)
  app.options('/*path', corsMiddleware);

  // ✅ 4. Request tracking
  app.use(requestTrackingMiddleware);

  // ✅ 5. ROUTES
  app.use("/api/account", accountRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/payment", paymentRouter);
  app.use('/api/support', userAuthMiddleware, supportRoutes);
  app.use("/api/v1/user", userAuthMiddleware, userRouter);
  app.use("/api/v1", baseRouter);
  app.use("", baseRouter);

  // ✅ 6. Error handler LAST
  app.use(errorMiddleware);

  return app;
}
