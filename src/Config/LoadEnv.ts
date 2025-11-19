import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Environment } from "../Shared/Common/Enums/Process.js";
import LocalEnvVars from "../Shared/Common/Models/LocalEnvVars.js";

// Load env variables
console.info("Environment:", process.env.NODE_ENV);
if (process.env.NODE_ENV == Environment.Development) {
    const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../src/Config/${process.env.NODE_ENV}.env`);
    console.info("Loading environment variables. File:", envFilePath);
    config(
        {
            path: envFilePath,
            debug: true
        }
    );
}
else {
    config();

}

interface EnvironmentVariableDetails {
    name: string;
    convertibleToType?: string;
}

let missingOrInvalidEnvVars: EnvironmentVariableDetails[] | undefined = [];
try {
    const requiredEnvVars: string[] = [
        "MONGO_URI", // MongoDb connection string with required details such as username, password, database, etc.
        "JWT_SECRET_PATH", // Path of .pem file containing private jwt secret for token generation and verification at server end
        "JWT_SECRET_PUBLIC_PATH", // Path of .pem file containing public jwt secret for token verification at client end
        "GOOGLE_CLIENT_ID", // Issued google client id to verify google sign in user
        "MQTT_BROKER_URL", // MQTT broken connection url
        "MQTT_BROKER_USERNAME", // MQTT broken connection username
        "MQTT_BROKER_PASSWORD", // MQTT broken connection password
        "MQTT_CLIENT_ID", // MQTT client id to persist session
        "MQTT_CONNECT_TIMEOUT", // MQTT connection timeout in milliseconds for which application will wait to connect and to get connction response from broker before throwing timeout error
        "MQTT_RECONNECT_PERIOD", // MQTT reconnection time in milliseconds after which application will attempt to reconnect if disconnected automatically
        "RAZORPAY_KEY_ID", // Razorpay client key for connection and verification
        "RAZORPAY_KEY_SECRET", // Razorpay client secret for connection and verification
        "MIN_ALLOWED_PAYMENT", // Minimum payment amount allowed to process through payment gateway to add into user wallet
        "CLIENT_URL", // Frontend url to restrict cross origin clients
        "PORT" // Port for hosting this application
    ];
    const NumericEnvVars: Set<string> = new Set<string>(
        ["MQTT_CONNECT_TIMEOUT", "MQTT_RECONNECT_PERIOD", "MIN_ALLOWED_PAYMENT", "PORT"]
    );

    for (const envVar of requiredEnvVars) {
        if (typeof process.env[envVar] !== "string") {
            missingOrInvalidEnvVars.push({ name: envVar });
        }
        else if (NumericEnvVars.has(envVar) && (process.env[envVar] === "" || !Number.isFinite(Number(process.env[envVar])))) {
            missingOrInvalidEnvVars.push({ name: envVar, convertibleToType: "number" });
        }
    }
}
finally {
    if (missingOrInvalidEnvVars.length > 0) {
        console.error("Missing required data to start the application.", missingOrInvalidEnvVars);
    }
}

if (missingOrInvalidEnvVars.length > 0) {
    throw new AggregateError(missingOrInvalidEnvVars.map(envVar =>
        envVar.convertibleToType
            ? new TypeError(`${envVar.name} required of type ${envVar.convertibleToType}.`)
            : new ReferenceError(`${envVar.name} required.`)))
    ;
}

missingOrInvalidEnvVars = undefined;

LocalEnvVars.initialize(fs.readFileSync(process.env.JWT_SECRET_PATH, 'utf8'), fs.readFileSync(process.env.JWT_SECRET_PUBLIC_PATH, 'utf8'));