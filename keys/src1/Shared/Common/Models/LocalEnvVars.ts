import { ArgumentError } from "../CustomErrors/Errors.js";

export default class LocalEnvVars {
    static #read: boolean = false;
    static #jwtPrivateKeyString: string;
    static #jwtPublicKeyString: string;

    private constructor() {}

    public static initialize(jwtPrivateKeyString: string, jwtPublicKeyString: string) {
        if (!this.#read) {
            if (typeof jwtPrivateKeyString === "string" && typeof jwtPublicKeyString === "string" && jwtPrivateKeyString && jwtPublicKeyString) {
                this.#jwtPrivateKeyString = jwtPrivateKeyString;
                this.#jwtPublicKeyString = jwtPublicKeyString;
                this.#read = true;
            }
            else {
                if (typeof jwtPrivateKeyString !== "string" || !jwtPrivateKeyString) {
                    throw new ArgumentError("jwtPrivateKeyString", `JWT private key is required. Actual Type: ${typeof jwtPrivateKeyString}`);
                }
                if (typeof jwtPublicKeyString !== "string" || !jwtPublicKeyString) {
                    throw new ArgumentError("jwtPublicKeyString", `JWT public key is required. Actual Type: ${typeof jwtPublicKeyString}`);
                }
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