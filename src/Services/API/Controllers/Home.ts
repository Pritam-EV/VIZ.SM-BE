import type { Request, Response } from "express";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { ProfileFlags } from "../../../Shared/Common/Enums/Member.js";
import type { RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";

// ⬇️ NEW imports
import { Login } from "../../../Shared/Data/MongoDB/Models/Login.js";
import { User } from "../../../Shared/Data/MongoDB/Models/User.js";
import { Device } from "../../../Shared/Data/MongoDB/Models/Device.js";

export default class HomeController {
  async getUserHomePageDetails(req: Request, res: Response) {
    const ctxUser = (req as RequestWithUser).customContext.user;

    // ✅ Must be authenticated
    if (!ctxUser) {
      res.status(ResponseStatus.Unauthorized).json({ message: "Unauthorized" });
      return;
    }

    // ✅ Must have User flag
    // if ((ctxUser.roles & ProfileFlags.User) !== ProfileFlags.User) {
    //   // Hide endpoint from non-user profiles (partners-only etc.)
    //   res.status(ResponseStatus.NotFound).end();
    //   return;
    // }

    try {
      const loginId = ctxUser.id;

      // 1) Get Login document for firstName / mobile / email
      const loginDoc = await Login.findById(loginId).lean();
      if (!loginDoc) {
        res.status(ResponseStatus.NotFound).json({ error: "Login not found" });
        return;
      }

      // 2) Get User document linked to this login
      const userDoc = await User.findOne({ login: loginId }).lean();

      // If user profile is missing, still return name with zero balance & no devices
      if (!userDoc) {
        res.status(ResponseStatus.Ok).json({
          firstName: loginDoc.firstName || "User",
          balance: 0,
          devices: [],
        });
        return;
      }

      // 3) Resolve all devices (may be zero)
      const deviceLinks = (userDoc.devices || []) as any[];
      let devices: any[] = [];

      if (deviceLinks.length > 0) {
        const deviceIds = deviceLinks
          .map((d) => d.device)
          .filter(Boolean);

        if (deviceIds.length > 0) {
          const deviceDocs = await Device.find({ _id: { $in: deviceIds } }).lean();

          devices = deviceDocs.map((d) => ({
            id: d._id,
            pool: d.pool ?? 0,
            rate: d.rate ?? 10.0,        // ✅ LIVE RATE from Device schema!
            isActive: d.status === "active",
          }));
        }
      }

      // 4) Always return firstName + balance + devices (possibly empty)
      res.status(ResponseStatus.Ok).json({
        firstName: loginDoc.firstName || "User",
        balance: userDoc.balance ?? 0,
        devices,
      });
    } catch (err: any) {
      console.error("❌ /api/v1/user/home error:", err);
      res.status(ResponseStatus.InternalServerError).json({
        error: "Failed to load user home data",
        details: err?.message || "Unknown error",
      });
    }
  }
}
