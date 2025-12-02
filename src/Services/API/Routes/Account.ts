import { Router } from "express";
import AccountController from "../Controllers/Account.js";

const accountRouter = Router();

const accountController = new AccountController();

accountRouter.post("/signin", accountController.signIn);

accountRouter.post("/signup/partner", accountController.partnerSignUp);

accountRouter.post("/signup/user", accountController.userSignUp);

export default accountRouter;