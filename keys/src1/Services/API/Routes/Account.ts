import express from "express";

import AccountController from "../Controllers/Account.js";
import authenticateUser from "../Middlewares/UserAuthentication.js";

const router = express.Router();
const controller = new AccountController();

// Sign up / sign in
router.post("/userSignUp", controller.userSignUp.bind(controller));
router.post("/partnerSignUp", controller.partnerSignUp.bind(controller));
router.post("/signIn", controller.signIn.bind(controller));

// Devices for logged-in user
// ✅ DEBUG LOGS
router.get("/devices/user", authenticateUser, (req, res, next) => {
  console.log("🚀 DEVICES ROUTE HIT!");
  controller.getUserDevices.bind(controller)(req, res, next);
});

// Profile for logged-in user
router.get("/profile", authenticateUser, (req, res, next) => {
  console.log("🚀 PROFILE ROUTE HIT!");  // ADD THIS
  controller.getProfile.bind(controller)(req, res, next);
});

export default router;
