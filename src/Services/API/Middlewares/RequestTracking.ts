import type { Request, Response, NextFunction } from "express";
import Logger, { DiagnosticsContext, DiagnosticsContextMemberParam } from "../../../Shared/Common/Models/Logging.js";
import type { RequestWithLoggerAndTracking } from "../../../Shared/Common/Types/ApiTypes.js";

export default async function trackRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const start = process.hrtime.bigint(); // High-resolution time for performance measurement
        const logger = new Logger(new DiagnosticsContext(true));
        logger.info("Request received", req);
        (req as RequestWithLoggerAndTracking).customContext = {
            logger: logger,
            startTime: start
        }

        res.on('finish', async () => {
            (req as RequestWithLoggerAndTracking).customContext.logger.addOrUpdateDiagnosticsData(new DiagnosticsContextMemberParam("latency_ms", Number((Number(process.hrtime.bigint() - ((req as RequestWithLoggerAndTracking).customContext.startTime)) / 1e6).toFixed(2))));
            (req as RequestWithLoggerAndTracking).customContext.logger.info("Response sent", res);
            // (req as RequestWithLoggerAndTracking).customContext = undefined;
        });
    }
    catch (error) {
        console.error("Error occurred while request tracking, skipping ...", { error, request: res, response: res });
    }

    next();
}