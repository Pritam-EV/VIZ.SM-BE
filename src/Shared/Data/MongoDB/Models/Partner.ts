import { Schema, model, type InferSchemaType } from "mongoose";
import { PartnerStatus } from "../../../Common/Enums/Member.js";
import type { IPartner } from "../IModels/Member.js";

export type { IPartner };
export { PartnerStatus };

// const PartnerSchema = new Schema<IPartner>(
const PartnerSchema = new Schema(
    {
        status: {
            type: Schema.Types.String,
            required: true,
            enum: Object.values(PartnerStatus),
            default: PartnerStatus.Active
        },
        login: {
            type: Schema.Types.ObjectId,
            required: true,
            unique: true,
            ref: "Login",
            immutable: true
        }
    },
    {
        timestamps: true
    }
);

export type PartnerType = InferSchemaType<typeof PartnerSchema>;

// export const Partner = model<IPartner>("Partner", PartnerSchema);
export const Partner = model("Partner", PartnerSchema);