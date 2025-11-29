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
    
    // ✅ SAFE HEADER VALIDATION
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        (req as RequestWithUser).customContext.logger.error("⚠️ Invalid Authorization header:", authHeader);
        throw new HttpError(ResponseStatus.Unauthorized, "Unauthorized: Invalid header format");
    }

    // ✅ SAFE TOKEN EXTRACTION
    const token = authHeader.substring(7).trim();
    if (!token || token.length < 100) {
        (req as RequestWithUser).customContext.logger.error("⚠️ Empty or invalid token length:", token?.length);
        throw new HttpError(ResponseStatus.Unauthorized, "Unauthorized: Invalid token");
    }

    (req as RequestWithUser).customContext.logger.debug("🔑 Verifying token (length:", token.length, ")");

    // ✅ HS256 (matches your login token creation)
    jwt.verify(token, LocalEnvVars.jwtPrivateKey, { algorithms: ["HS256"] }, async (err, decoded) => {
        if (err) {
            if (err instanceof jwt.TokenExpiredError) {
                (req as RequestWithUser).customContext.logger.error("❌ JWT Token Expired:", err);
                throw new AlertError(ResponseStatus.Unauthorized, "Token has expired. Please log in again.", ErrorAlertTypes.Error);
            }
            (req as RequestWithUser).customContext.logger.error("❌ JWT Verification Failed:", err.message);
            throw new HttpError(ResponseStatus.Forbidden, `Invalid token: ${err.message}`);
        }

        // ✅ Token validation (unchanged)
        if (!(typeof decoded === "object" && 
              typeof decoded.sub === "string" && decoded.sub && 
              typeof decoded.roles === "number" && 
              (typeof decoded.pIds === "undefined" || 
               (Array.isArray(decoded.pIds) && (decoded.pIds.length === 1 || decoded.pIds.length === 2))))) {
            (req as RequestWithUser).customContext.logger.error("❌ Token missing required fields:", decoded);
            throw new AlertError(ResponseStatus.Forbidden, "Please Sign Up", ErrorAlertTypes.Critical);
        }

        (req as RequestWithUser).customContext.user = { 
            id: decoded.sub, 
            roles: decoded.roles, 
            pIds: decoded.pIds as ([string, string?] | undefined) 
        };
        (req as RequestWithUser).customContext.logger.addOrUpdateDiagnosticsData(
            new DiagnosticsContextMemberParam("userId", decoded.sub)
        );
        
        (req as RequestWithUser).customContext.logger.debug("✅ Token verified for user:", decoded.sub);
        next();
    });
}
