import { Router } from "express";
import HealthController from "../Controllers/Health.js";

const baseRouter = Router();

const healthController = new HealthController();

baseRouter.all("/error", healthController.error);

baseRouter.all("/ping", healthController.ping);

baseRouter.all("*anything", async (req, res) => {
    res.status(404).end();
});

export default baseRouter;