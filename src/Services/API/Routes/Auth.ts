import { Router } from "express";
import AuthController from "../Controllers/Auth.js";

const authRouter = Router();

const authController = new AuthController();

authRouter.get("/jwks", authController.getJwtPublicKey);

export default authRouter;