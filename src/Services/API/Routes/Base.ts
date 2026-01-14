import { Router } from "express";
import AuthController from "../Controllers/Auth.js";
import HealthController from "../Controllers/Health.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";

const baseRouter = Router();

const authController = new AuthController();
const healthController = new HealthController();

baseRouter.get("/.well-known/jwks.json", authController.getJwtPublicKey);

baseRouter.all("/error", healthController.error);

baseRouter.all("/ping", healthController.ping);

baseRouter.all("*anything", async (req, res) => {
    res.status(ResponseStatus.NotFound).end();
});

export default baseRouter;