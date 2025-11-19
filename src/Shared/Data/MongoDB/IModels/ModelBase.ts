import type { Schema } from "mongoose";

type AllowedModelIdType = string | bigint | number
    | Schema.Types.ObjectId | Schema.Types.UUID | Schema.Types.String
    | Schema.Types.BigInt | Schema.Types.Decimal128 | Schema.Types.Double | Schema.Types.Int32 | Schema.Types.Number
;

export interface IModel<TId extends AllowedModelIdType> {
    readonly _id: TId;
}

export interface IModelTimeStamps {
    readonly createdAt: Date;
    readonly updatedAt: Date;
}