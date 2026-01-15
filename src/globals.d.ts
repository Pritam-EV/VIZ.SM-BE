import type { Environment } from "./Shared/Common/Enums/Process.ts"

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: Environment,
            MONGO_URI: string;
            JWT_SECRET_PATH: string;
            JWT_SECRET_PUBLIC_PATH: string;
            GOOGLE_CLIENT_ID: string;
            MQTT_BROKER_URL: string;
            MQTT_BROKER_USERNAME: string;
            MQTT_BROKER_PASSWORD: string;
            MQTT_CLIENT_ID: string;
            MQTT_CONNECT_TIMEOUT: number | string;
            MQTT_RECONNECT_PERIOD: number | string;
            RAZORPAY_KEY_ID: string;
            RAZORPAY_KEY_SECRET: string;
            MIN_ALLOWED_PAYMENT: number | string;
            CLIENT_URL: string;
            PORT: number | string;
            CASHFREE_APP_ID: string;
            CASHFREE_SECRET_KEY: string;
            OUR_PHONE: number | string;
        }
    }
}

export {};