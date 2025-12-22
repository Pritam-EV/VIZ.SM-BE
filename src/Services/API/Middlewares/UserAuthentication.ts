import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError, AlertError } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import { ErrorAlertTypes } from "../../../Shared/Common/Enums/AlertTypes.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { DiagnosticsContextMemberParam } from "../../../Shared/Common/Models/Logging.js";
import type { RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";
import LocalEnvVars from "../../../Shared/Common/Models/LocalEnvVars.js";

export default async function authenticateUser(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        (req as RequestWithUser).customContext.logger.error("⚠️ No Authorization header found");
        throw new HttpError(ResponseStatus.Unauthorized, "Unauthorized: No token provided");
    }
    (req as RequestWithUser).customContext.logger.debug("🔑 Received Authorization Header:", authHeader);

    const token = authHeader.split(" ")[1]; // Ensure correct extraction
    // (req as RequestWithUser).customContext.logger.debug("📌 Extracted Token:", token);

    jwt.verify(token!, LocalEnvVars.jwtPrivateKey, { algorithms: ["RS256"] }, async (err, decoded) => {
        if (err) {
            // Specific error handling for expired token
            if (err instanceof jwt.TokenExpiredError) {
                (req as RequestWithUser).customContext.logger.error("❌ JWT Token Expired:", err);

                throw new AlertError(ResponseStatus.Unauthorized, "Token has expired. Please log in again.", ErrorAlertTypes.Error);
            }
            (req as RequestWithUser).customContext.logger.error("❌ JWT Verification Failed:", err);

            throw new HttpError(ResponseStatus.Forbidden, `Invalid token. ${err.message}`);
        }

        if (!(typeof decoded === "object" && typeof decoded.sub === "string" && decoded.sub && typeof decoded.roles === "number" && (typeof decoded.pIds === "undefined" || (Array.isArray(decoded.pIds) && (decoded.pIds.length === 1 || decoded.pIds.length === 2))))) {
            (req as RequestWithUser).customContext.logger.error("❌ Token missing required fields.", "decoded data:", decoded);
            
            throw new AlertError(ResponseStatus.Forbidden, "Please Sign Up", ErrorAlertTypes.Critical);
        }

        // (req as RequestWithUser).customContext.logger.debug("✅ Token Verified! Decoded Data:", decoded);
        (req as RequestWithUser).customContext.user = { id: decoded.sub, roles: decoded.roles, pIds: decoded.pIds as ([string, string?] | undefined) }; // ✅ Explicitly set id of the user
        (req as RequestWithUser).customContext.logger.addOrUpdateDiagnosticsData(new DiagnosticsContextMemberParam("userId", decoded.sub));
        
        // 🔥 ADD THESE LINES ↓↓↓
        // Mirror user info onto the plain req object for routes that use (req as any).userId / .user
        (req as any).userId = decoded.sub;
        (req as any).user = (req as RequestWithUser).customContext.user;
        // 🔥 ADD THESE LINES ↑↑↑

        next();
    });
}