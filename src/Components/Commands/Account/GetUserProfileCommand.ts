import type Logger from "../../../Shared/Common/Models/Logging.js";
import mongoose from "mongoose";

export class Command {
  readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}

export type TResult = [true, { user: any }] | [false, { error: string }];

interface UserProfile {
  firstName?: string;
  mobile?: string;
  email?: string;
}

export class Handler {
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  public async handle(command: Command): Promise<TResult> {
    try {
      this.#logger.info(`🔍 Fetching profile for user: ${command.userId}`);

      // ✅ SIMPLIFIED - Direct collection query (NO SCHEMA CONFLICT)
      const UserModel = mongoose.connection.collection('users');
      
      const user: any = await UserModel.findOne(
        { _id: new mongoose.Types.ObjectId(command.userId) },
        { projection: { firstName: 1, mobile: 1, email: 1 } }
      );

      console.log("✅ Found user profile:", user ? "YES" : "NO", user);

      if (!user) {
        return [false, { error: "User not found" }];
      }

      return [
        true,
        {
          user: {
            firstName: user.firstName || "",
            mobile: user.mobile || "",
            email: user.email || "",
          },
        },
      ];
    } catch (error: any) {
      console.error("❌ Profile fetch error:", error.message);
      this.#logger.error(
        `❌ Profile fetch failed: ${error.message}`,
        { userId: command.userId },
      );
      return [false, { error: "Failed to fetch profile" }];
    }
  }
}
