import { Router } from "express";
import PaymentController from "../Controllers/Payment.js";

const paymentRouter = Router();

const paymentController = new PaymentController();

paymentRouter.post("/userwallet/order", paymentController.createUserWalletTopupOrder);

paymentRouter.get("/userwallet/orderstatus", paymentController.getUserWalletTopupOrderStatus);

export default paymentRouter;