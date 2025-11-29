import express from 'express';
import AccountController from '../Controllers/Account.js';
import authenticateUser from '../Middlewares/UserAuthentication.js';  // ✅ CORRECT IMPORT

const router = express.Router();
const controller = new AccountController();

router.post('/userSignUp', controller.userSignUp.bind(controller));
router.post('/partnerSignUp', controller.partnerSignUp.bind(controller));
router.post('/signIn', controller.signIn.bind(controller));

// ✅ FIXED: Use authenticateUser directly (not authenticateJWT)
router.get(
  "/devices/user",
  authenticateUser,  // ✅ CORRECT middleware name
  controller.getUserDevices.bind(controller)
);

export default router;
