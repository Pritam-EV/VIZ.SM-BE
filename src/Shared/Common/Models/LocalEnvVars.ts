import { ArgumentError } from "../CustomErrors/Errors.js";

export default class LocalEnvVars {
    static #read: boolean = false;
    static #jwtPrivateKeyString: string;
    static #jwtPublicKeyString: string;

    private constructor() {}

public static initialize(jwtPrivateKeyString: string, jwtPublicKeyString: string) {
    if (!this.#read) {
        if (typeof jwtPrivateKeyString === "string" && jwtPrivateKeyString && 
            typeof jwtPublicKeyString === "string" && jwtPublicKeyString) {
            this.#jwtPrivateKeyString = jwtPrivateKeyString;
            this.#jwtPublicKeyString = jwtPublicKeyString;
            this.#read = true;
        }
    }
}


    public static get jwtPrivateKey(): string {
        return this.#jwtPrivateKeyString;
    }

    public static get jwtPublicKey(): string {
        return this.#jwtPublicKeyString;
    }
}
// LocalEnvVars.jwtPrivateKey → LocalEnvVars.jwtSecret
export const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
