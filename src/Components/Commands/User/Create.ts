import { Error as MongooseErrors, mongo, startSession, type FilterQuery } from "mongoose";
import { AlertError, HttpError } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import { ErrorAlertTypes } from "../../../Shared/Common/Enums/AlertTypes.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Login, LoginStatus, type LoginType } from "../../../Shared/Data/MongoDB/Models/Login.js";
import { User, UserStatus } from "../../../Shared/Data/MongoDB/Models/User.js";
import { getPasswordHash } from "../../Helpers/LoginHelpers.js";

/**
 * Command DTO for creating a user.
 * Keep fields minimal and consistent with what the backend expects.
 */
export class Command {
  firstName: string;
  middleName: string;
  lastName: string;
  mobile: number;
  email: string;
  password: string;

  constructor(
    firstName: string,
    mobile: number,
    email: string,
    password: string,
    middleName: string,
    lastName: string
  ) {
    this.firstName = firstName;
    this.middleName = middleName;   // stays as string | undefined
    this.lastName = lastName;       // stays as string | undefined
    this.mobile = mobile;
    this.email = email;
    this.password = password;
  }
}




/**
 * Handler responsible for creating Login + User in a transaction.
 * Returns [true, null] on success, or [false, string[]] where string[] are invalid field names.
 */
export class Handler {
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  public async handle(command: Command): Promise<[true, null] | [false, string[]]> {
    let mongooseSession: mongo.ClientSession | null = null;

    try {
      // Build Login instance and validate it (this returns either instance or invalid fields)
      const [newLogin, invalidLoginFields] = await this.#buildLogin(command);

      if (invalidLoginFields && invalidLoginFields.length > 0) {
        // map backend field names to frontend-friendly names
        const normalized = invalidLoginFields.map((f) => {
          if (f === "midName") return "middleName";
          if (f === "pass") return "password";
          return f;
        });
        return [false, normalized];
      }

      if (!newLogin) {
        // cannot proceed without a login instance
        return [false, ["login"]];
      }

      // Check for existing login conflicts
      const loginFindOneFilterOrQuery: FilterQuery<LoginType>[] = [
        { mobile: newLogin.mobile },
        { email: newLogin.email }
      ];
      if (newLogin.aadhar) loginFindOneFilterOrQuery.push({ aadhar: newLogin.aadhar });
      if (newLogin.pan) loginFindOneFilterOrQuery.push({ pan: newLogin.pan });

      const existingLogin = await Login.findOne(
        { $or: loginFindOneFilterOrQuery },
        { _id: 0, mobile: 1, email: 1, aadhar: 1, pan: 1 },
        { lean: true }
      ).lean().exec();

      if (existingLogin) {
        if (existingLogin.mobile == newLogin.mobile || existingLogin.email == newLogin.email) {
          throw new AlertError(ResponseStatus.Conflict, "Email address or mobile number is already in use.", ErrorAlertTypes.Error);
        }
        if (
          (existingLogin.aadhar && newLogin.aadhar && existingLogin.aadhar == newLogin.aadhar) ||
          (existingLogin.pan && newLogin.pan && existingLogin.pan == newLogin.pan)
        ) {
          throw new AlertError(ResponseStatus.BadRequest, "Aadhar card number or Pan card number is already in use.", ErrorAlertTypes.Error);
        }
      }

      // Start a transaction and persist Login + User
      mongooseSession = await startSession();
      await mongooseSession.withTransaction(async () => {
        // DEBUG logging (server-side)
        try {
          this.#logger.info("Creating Login inside transaction");
          if ((this.#logger as any).debug) {
            (this.#logger as any).debug && (this.#logger as any).debug("newLogin before save: " + JSON.stringify(newLogin.toObject ? newLogin.toObject() : newLogin));
          }
        } catch (logErr) {
          // ignore logging errors
        }

        // Save the Login instance inside the session
        const savedLogin = await newLogin.save({ session: mongooseSession });

        // Prepare the User payload
        const userPayload = {
          status: UserStatus.Active,
          balance: 0,
          login: savedLogin._id
        };

        // Create the User (use array form when passing session to Model.create)
        const created = await User.create([userPayload], { session: mongooseSession });

        // Log created ids
        try {
          this.#logger.info("Created user(s): " + (Array.isArray(created) ? created.map((u) => (u as any)._id?.toString()).join(",") : (created as any)?._id?.toString()));
        } catch (logErr) {
          // ignore
        }
      });

      return [true, null];
    } catch (error: any) {
      // If the error is a known HttpError, bubble it up
      if (error instanceof HttpError) {
        throw error;
      }

      // Mongoose validation error that might happen outside #buildLogin
      if (error instanceof MongooseErrors.ValidationError) {
        const keys = Object.keys(error.errors || {});
        this.#logger.warn(error as Error, "Validation failed while creating a user.", { input: command, invalid: keys });
        return [false, keys];
      }

      // Log the error with context
      this.#logger.error(error as Error, "Error occured while creating a user.", { input: command });

      // Throw a generic HttpError with message (keeps stack hidden from client)
      const message =
        error && error.message
          ? `Something failed while creating a user account: ${error.message}`
          : "Something failed while creating a user account.";
      throw new HttpError(500, message);
    } finally {
      if (mongooseSession) {
        try {
          mongooseSession.endSession();
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Build the Login instance and validate it.
   * Returns either [loginInstance, null] or [null, invalidFieldsArray]
   */
  async #buildLogin(command: Command): Promise<[any, null] | [null, string[]]> {
    try {
      // Build Login instance - use the Login model constructor
      const newLogin: any = new Login({
        firstName: command.firstName,
        mobile: command.mobile,
        email: command.email,
        // pass: await getPasswordHash(command.password, false),
        pass: command.password,
        status: LoginStatus.Active
      });

      if (command.middleName) newLogin.midName = command.middleName;
      if (command.lastName) newLogin.lastName = command.lastName;


      // Validate synchronously
      await newLogin.validate();

      return [newLogin, null];
    } catch (error: any) {
      console.error(error, "Failed to build login for a new user.");
      if (error instanceof MongooseErrors.ValidationError) {
        return [null, Object.keys(error.errors)];
      }
      if (error instanceof MongooseErrors.CastError) {
        return [null, [error.path]];
      }
      throw error;
    }
  }
}
