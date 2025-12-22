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
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Origin",
      req.headers.origin || "https://smeter.vjratechnologies.com"
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
    return res.sendStatus(200);
  }

  const reqWithUser = req as RequestWithUser;
console.log("🔍 UserAuth middleware hit:", req.method, req.path);
console.log("🔍 customContext exists:", !!reqWithUser.customContext);
console.log("🔍 logger exists:", !!reqWithUser.customContext?.logger);

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    reqWithUser.customContext?.logger?.error("⚠️ No Authorization header found");
    return next(
      new HttpError(
        ResponseStatus.Unauthorized,
        "Unauthorized: No token provided"
      )
    );
  }

  reqWithUser.customContext?.logger?.debug(
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
          reqWithUser.customContext?.logger?.error(
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

        reqWithUser.customContext?.logger?.error(
          "❌ JWT Verification Failed:",
          err
        );
        return next(
          new HttpError(
            ResponseStatus.Forbidden,
            `Invalid token. ${err.message}`
          )
        );
      }

      if (
        !(
          typeof decoded === "object" &&
          typeof (decoded as any).sub === "string" &&
          (decoded as any).sub &&
          typeof (decoded as any).roles === "number" &&
          (typeof (decoded as any).pIds === "undefined" ||
            (Array.isArray((decoded as any).pIds) &&
              (((decoded as any).pIds as unknown[]).length === 1 ||
                ((decoded as any).pIds as unknown[]).length === 2)))
        )
      ) {
        reqWithUser.customContext?.logger?.error(
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

      // Set user context
      reqWithUser.customContext.user = {
        id: (decoded as any).sub,
        roles: (decoded as any).roles,
        pIds: (decoded as any).pIds as [string, string?] | undefined,
      };

      reqWithUser.customContext.logger.addOrUpdateDiagnosticsData(
        new DiagnosticsContextMemberParam("userId", (decoded as any).sub)
      );

      // Mirror onto plain req for handlers using (req as any).userId / .user
      (req as any).userId = (decoded as any).sub;
      (req as any).user = reqWithUser.customContext.user;

      return next();
    }
  );
}
