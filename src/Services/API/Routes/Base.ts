import { Router } from "express";
import AuthController from "../Controllers/Auth.js";
import HealthController from "../Controllers/Health.js";

const baseRouter = Router();

const authController = new AuthController();
const healthController = new HealthController();

baseRouter.get("/.well-known/jwks.json", authController.getJwtPublicKey);

baseRouter.all("/error", healthController.error);

baseRouter.all("/ping", healthController.ping);

baseRouter.all("*anything", async (req, res) => {
    res.status(404).end();
});

export default baseRouter;