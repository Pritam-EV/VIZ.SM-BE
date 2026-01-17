import { Router } from "express";
import PaymentController from "../Controllers/Payment.js";
import authenticateUser from "../Middlewares/UserAuthentication.js";  // ← YOUR EXACT MIDDLEWARE

const paymentRouter = Router();
const paymentController = new PaymentController();

// ← ADD THESE 2 LINES: Apply authenticateUser to ALL payment routes
paymentRouter.post("/userwallet/order", authenticateUser, paymentController.createUserWalletTopupOrder);
paymentRouter.get("/userwallet/orderstatus", authenticateUser, paymentController.getUserWalletTopupOrderStatus);

export default paymentRouter;
