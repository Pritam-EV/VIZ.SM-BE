// src/Services/API/Routes/Account.ts
import express from 'express';
import AccountController from '../Controllers/Account.js';  // ← Points to your controller

const router = express.Router();
const controller = new AccountController();

router.post('/userSignUp', controller.userSignUp.bind(controller));
router.post('/partnerSignUp', controller.partnerSignUp.bind(controller));
router.post('/signIn', controller.signIn.bind(controller));

export default router;
