import { Router } from "express";
import PaymentController from "../Controllers/Payment.js";
import authenticateUser from "../Middlewares/UserAuthentication.js";

const paymentRouter = Router();

const paymentController = new PaymentController();

// ✅ CRITICAL: Apply authenticateUser middleware to validate JWT before handler
paymentRouter.post("/userwallet/order", authenticateUser, paymentController.createUserWalletTopupOrder);

paymentRouter.get("/userwallet/orderstatus", authenticateUser, paymentController.getUserWalletTopupOrderStatus);

export default paymentRouter;
