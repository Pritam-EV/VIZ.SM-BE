import type { Request, Response, NextFunction } from "express";
import { isHttpError } from "http-errors";
import { AlertError, HttpError, ResponseStatus } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import { toAlertType } from "../../../Shared/Common/Enums/AlertTypes.js";
import { Alert, AlertsResponse, BaseMessageResponse } from "../../../Shared/Common/Models/Responses.js";
import type { RequestWithLoggerOnly } from "../../../Shared/Common/Types/ApiTypes.js";
import type { LoggableType } from "../../../Shared/Common/Types/LoggableTypes.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function handleError(err: unknown, req: Request, res: Response, next: NextFunction) {
    try {
        if ((req as RequestWithLoggerOnly).customContext?.logger) {
            (req as RequestWithLoggerOnly).customContext.logger.error(err as LoggableType, "Something went wrong.");
        }
        else {
            console.error(err, "Something went wrong", "Request:", req);
        }

        if (typeof err === "object" && err instanceof Error) {
            if (err instanceof HttpError) {
                if (err.doExpose) {
                    if (err instanceof AlertError) {
                        res.status(err.statusCode).json(new AlertsResponse(new Alert(err.message, toAlertType(err.alertType))));
                    }
                    else {
                        res.status(err.statusCode).json(new BaseMessageResponse(err.message));
                    }
                }
                else {
                    res.status(err.statusCode).end();
                }
            }
            else if (isHttpError(err)) {
                res.status(err.statusCode).send(`${(err.expose ? err.message : "Something went wrong.")}`);
            }
        }
    }
    catch (error) {
        console.error("An error occured while handling the previous error.", { newError: error, previousError: err });
    }

    try {
        res.status(ResponseStatus.InternalServerError).send("Something went wrong.");
    }
    catch {
        res.end();
    }
}