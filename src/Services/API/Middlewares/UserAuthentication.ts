import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError, AlertError } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import { ErrorAlertTypes } from "../../../Shared/Common/Enums/AlertTypes.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { DiagnosticsContextMemberParam } from "../../../Shared/Common/Models/Logging.js";
import type { RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";
import LocalEnvVars from "../../../Shared/Common/Models/LocalEnvVars.js";

export default async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // ✅ 1. ALLOW CORS PREFLIGHT (CRITICAL FIX)
if (req.method === "OPTIONS") {
  res.setHeader(
    "Access-Control-Allow-Origin",
    req.headers.origin || "https://smartmeter-vjratechnologies.web.app"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "3600");

  return res.sendStatus(200); // <- important: don't call next()
}



  const authHeader = req.headers.authorization;
  if (!authHeader) {
    (req as RequestWithUser).customContext?.logger?.error(
      "⚠️ No Authorization header found"
    );
    return next(
      new HttpError(ResponseStatus.Unauthorized, "Unauthorized: No token provided")
    );
  }

  (req as RequestWithUser).customContext?.logger?.debug(
    "🔑 Received Authorization Header:",
    authHeader
  );

  const token = authHeader.split(" ")[1];

  jwt.verify(
    token!,
    LocalEnvVars.jwtPrivateKey,
    { algorithms: ["RS256"] },
    (err, decoded) => {
      if (err) {
        if (err instanceof jwt.TokenExpiredError) {
          (req as RequestWithUser).customContext?.logger?.error(
            "❌ JWT Token Expired:",
            err
          );
          return next(
            new AlertError(
              ResponseStatus.Unauthorized,
              "Token has expired. Please log in again.",
              ErrorAlertTypes.Error
            )
          );
        }

        (req as RequestWithUser).customContext?.logger?.error(
          "❌ JWT Verification Failed:",
          err
        );
        return next(
          new HttpError(ResponseStatus.Forbidden, `Invalid token. ${err.message}`)
        );
      }

      // ✅ 2. KEEP YOUR STRICT VALIDATION (UNCHANGED)
      if (
        !(
          typeof decoded === "object" &&
          typeof decoded.sub === "string" &&
          decoded.sub &&
          typeof decoded.roles === "number" &&
          (typeof decoded.pIds === "undefined" ||
            (Array.isArray(decoded.pIds) &&
              (decoded.pIds.length === 1 || decoded.pIds.length === 2)))
        )
      ) {
        (req as RequestWithUser).customContext?.logger?.error(
          "❌ Token missing required fields.",
          "decoded data:",
          decoded
        );
        return next(
          new AlertError(
            ResponseStatus.Forbidden,
            "Please Sign Up",
            ErrorAlertTypes.Critical
          )
        );
      }

      // ✅ 3. KEEP EXISTING CONTEXT SETUP (UNCHANGED)
      (req as RequestWithUser).customContext.user = {
        id: decoded.sub,
        roles: decoded.roles,
        pIds: decoded.pIds as ([string, string?] | undefined),
      };

      (req as RequestWithUser).customContext.logger.addOrUpdateDiagnosticsData(
        new DiagnosticsContextMemberParam("userId", decoded.sub)
      );

      // ✅ 4. MIRROR DATA (YOU ALREADY NEEDED THIS)
      (req as any).userId = decoded.sub;
      (req as any).user = (req as RequestWithUser).customContext.user;

      next();
    }
  );
}
