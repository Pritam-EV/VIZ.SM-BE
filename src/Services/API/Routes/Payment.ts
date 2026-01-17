import { Router } from "express";
import PaymentController from "../Controllers/Payment.js";
import authenticateUser from "../Middlewares/UserAuthentication.js"; // path based on your project

const paymentRouter = Router();

const paymentController = new PaymentController();

paymentRouter.post(
  "/userwallet/order",
  authenticateUser,                             // ← add this
  paymentController.createUserWalletTopupOrder  // ← runs after user is set
);

paymentRouter.get(
  "/userwallet/orderstatus",
  authenticateUser,                              // ← add this
  paymentController.getUserWalletTopupOrderStatus
);


export default paymentRouter;