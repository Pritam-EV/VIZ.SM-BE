import type { Request, Response } from "express";
import { ArgumentError } from "../../../Shared/Common/CustomErrors/Errors.js";
import { HttpError } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";

export default class HealthController
{
    async ping(req: Request, res: Response) {
        res.status(200).send("pong");
    }

    async error(req: Request<{ message: string }>) {
        const { message } = req.query;
        if (message && typeof message !== "string") {
            throw new ArgumentError("message", `Parameter 'message' has invalid type. Expected: 'string' Actual: '${typeof message}'`);
        }
        if (message) {
            throw new HttpError(ResponseStatus.InternalServerError, message, true);
            // res.status(500).send(message);
        }
        else {
            throw new Error();
            // res.status(500).send("error");
        }
    }

    // /health, /health/ready, /health/live
    // async health(req, res) {
    //     // Check following
    //     // Database connectivity
    //     // External API reachability
    //     // Message queue status
    //     // File system access
    //     // Resouce usage such as Memory, ...
    // }
}