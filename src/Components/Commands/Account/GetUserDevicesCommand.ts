import type { FilterQuery } from "mongoose";
import { HttpError } from "../../../Shared/Common/CustomErrors/HttpErrors.js";  // ✅ .js REQUIRED
import type Logger from "../../../Shared/Common/Models/Logging.js";            // ✅ .js REQUIRED
import { Device } from "../../../Shared/Data/MongoDB/Models/Device.js";       // ✅ .js REQUIRED
import { DeviceStatus } from "../../../Shared/Common/Enums/Device.js";        // ✅ .js REQUIRED

export class Command {
  readonly userId: string;
  constructor(userId: string) {
    this.userId = userId;
  }
}

export type TResult = [true, { device: any | null }] | [false, string[]];

export class Handler {
  readonly #logger: Logger;
  constructor(logger: Logger) {
    this.#logger = logger;
  }

  public async handle(command: Command): Promise<TResult> {
    try {
            console.log('🔍 Searching for user:', command.userId); // ADD
      const userDevicesFilter: FilterQuery<any> = {
        user: command.userId,
        status: { $in: [DeviceStatus.Active, DeviceStatus.Pending] }
      };
console.log('🔍 Filter:', JSON.stringify(userDevicesFilter)); // ADD
      const device = await Device.findOne(
        userDevicesFilter,
        { serialnumber: 1, pool: 1, status: 1, rate: 1, totalEnergy: 1 }
      ).lean();
  console.log('🔍 Found device:', device); // ADD
      return [true, { device: device || null }];
    } catch (error) {
      this.#logger.error(error as Error, "Failed to fetch user devices", { 
        userId: command.userId 
      });
      throw new HttpError(500, "Failed to fetch devices");
    }
  }
}
