import { Router } from "express";
import express from 'express';
import AccountController from "../Controllers/Account.js";

const accountRouter = Router();

const accountController = new AccountController();

const router = express.Router();

router.post('/userSignUp', accountController.userSignUp.bind(accountController));
router.post('/partnerSignUp', accountController.partnerSignUp.bind(accountController));
router.post('/signIn', accountController.signIn.bind(accountController));

export default accountRouter;