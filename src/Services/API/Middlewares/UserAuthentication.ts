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
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    (req as RequestWithUser).customContext.logger.error("⚠️ Invalid Authorization header:", authHeader);
    return next(new HttpError(ResponseStatus.Unauthorized, "Unauthorized: Invalid header format"));
  }

  // ✅ SAFE TOKEN EXTRACTION
  const token = authHeader.substring(7).trim();
  if (!token || token.length < 100) {
    (req as RequestWithUser).customContext.logger.error("⚠️ Empty or invalid token length:", token?.length);
    return next(new HttpError(ResponseStatus.Unauthorized, "Unauthorized: Invalid token"));
  }

  (req as RequestWithUser).customContext.logger.debug("🔑 Verifying token (length:", token.length, ")");

  // ✅ RS256 verification using PUBLIC key
  jwt.verify(token, LocalEnvVars.jwtPublicKey, { algorithms: ["RS256"] }, async (err, decoded) => {
    try {
      if (err) {
        if (err instanceof jwt.TokenExpiredError) {
          (req as RequestWithUser).customContext.logger.error("❌ JWT Token Expired:", err);
          return next(new AlertError(ResponseStatus.Unauthorized, "Token has expired. Please log in again.", ErrorAlertTypes.Error));
        }
        (req as RequestWithUser).customContext.logger.error("❌ JWT Verification Failed:", err.message);
        return next(new HttpError(ResponseStatus.Forbidden, `Invalid token: ${err.message} ${token}`));
      }

      // decoded should be an object with expected claims
      const payload = decoded as any;

      // ✅ Token validation (unchanged)
      if (
        !(
          typeof payload === "object" &&
          typeof payload.sub === "string" &&
          payload.sub &&
          typeof payload.roles === "number" &&
          (typeof payload.pIds === "undefined" ||
            (Array.isArray(payload.pIds) && (payload.pIds.length === 1 || payload.pIds.length === 2)))
        )
      ) {
        (req as RequestWithUser).customContext.logger.error("❌ Token missing required fields:", payload);
        return next(new AlertError(ResponseStatus.Forbidden, "Please Sign Up", ErrorAlertTypes.Critical));
      }

      (req as RequestWithUser).customContext.user = {
        id: payload.sub,
        roles: payload.roles,
        pIds: payload.pIds as ([string, string?] | undefined),
      };
      (req as RequestWithUser).customContext.logger.addOrUpdateDiagnosticsData(
        new DiagnosticsContextMemberParam("userId", payload.sub)
      );

      (req as RequestWithUser).customContext.logger.debug("✅ Token verified for user:", payload.sub);
      return next();
    } catch (ex) {
      // catch any unexpected error inside callback and pass to next
      (req as RequestWithUser).customContext.logger.error("❌ Error in authentication callback:", ex);
      return next(new HttpError(ResponseStatus.InternalServerError, "Internal error during token verification"));
    }
  });
}
