import { Schema, model, type InferSchemaType } from "mongoose";
import { DeviceStatus } from "../../../Common/Enums/Device.js";
import type { IDevice, IDeviceAddress, IDeviceAddressLine1, IDeviceAddressLine2, IElectricTelemetry, IMeterTelemetry } from "../IModels/Device.js";

export type { IDevice, IDeviceAddress, IDeviceAddressLine1, IDeviceAddressLine2, IElectricTelemetry, IMeterTelemetry };

const DeviceAddressLine1Schema = new Schema<IDeviceAddressLine1>(
    {
        room: {
            type: Schema.Types.String,
            required: true,
            minLength: 1,
            maxLength: 8
        },
        floor: {
            type: Schema.Types.String,
            required: true,
            minLength: 1,
            maxLength: 5
        },
        building: {
            type: Schema.Types.String,
            required: true,
            minLength: 5,
            maxLength: 25
        },
        society: {
            type: Schema.Types.String,
            maxLength: 25
        }
    },
    {
        _id: false
    }
);

const DeviceAddressLine2Schema = new Schema<IDeviceAddressLine2>(
    {
        lane: {
            type: Schema.Types.String,
            maxLength: 10
        },
        area: {
            type: Schema.Types.String,
            maxLength: 25
        },
        road: {
            type: Schema.Types.String,
            maxLength: 50
        },
        landmark: {
            type: Schema.Types.String,
            maxLength: 100
        }
    },
    {
        _id: false
    }
);

const DeviceAddressSchema = new Schema<IDeviceAddress>(
    {
        line1: {
            type: DeviceAddressLine1Schema,
            required: true
        },
        line2: {
            type: DeviceAddressLine2Schema,
            required: true
        },
        city: {
            type: Schema.Types.String,
            required: true,
            minLength: 3,
            maxLength: 50
        },
        subdivision: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            minLength: 3,
            maxLength: 50,
        },
        district: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            minLength: 3,
            maxLength: 50,
        },
        state: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            minLength: 3,
            maxLength: 50,
        },
        postalCode: {
            type: Schema.Types.Number,
            required: true,
            min: [100001, "Invalid postal code"],
            max: [9999999999, "Invalid postal code"],
        },
        latitude: {
            type: Schema.Types.Number,
            required: true,
            min: [-90, "Invalid latitude"],
            max: [90, "Invalid latitude"],
            immutable: true
        },
        longitude: {
            type: Schema.Types.Number,
            required: true,
            min: [-180, "Invalid longitude"],
            max: [180, "Invalid longitude"],
            immutable: true
        }
    },
    {
        _id: false
    }
);

const ElectricTelemetrySchema = new Schema<IElectricTelemetry>(
    {
        voltage: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Voltage reading should not be negative."]
        },
        current: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Current reading should not be negative."]
        },
        power: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Power should not be negative."]
        },
        timeStamp: {
            type: Schema.Types.Date,
            required: true
        }
    },
    {
        _id: false
    }
);

/**
 * @todo refactor configuring minimum value for rate, validations for consumerId
 */
// const DeviceSchema = new Schema<IDevice>(
const DeviceSchema = new Schema(
    {
        _id: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            uppercase: true,
            minLength: 10,
            maxLength: 20,
            // unique: true, // implicit
            immutable: true
        },
        // TODO: configure correct validations
        consumerId: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            minLength: 5,
            // immutable: true
        },
        address: {
            type: DeviceAddressSchema,
            required: true
        },
        status: {
            type: Schema.Types.String,
            required: true,
            enum: Object.values(DeviceStatus),
            default: DeviceStatus.Pending
        },
        /**
         * Unit: INR (₹) per Kilo Watt Hour  
         * Accuracy: upto ₹0.01/kWh  
         * Minimum: ₹10/kWh  
         * Default: ₹20/kWh  
         */
        rate: {
            type: Schema.Types.Number,
            required: true,
            min: [10, "Invalid rate"],
            default: 20
        },
        pool: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Negative pool balance is not allowed"],
            default: 0
        },
        totalEnergy: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Total energy consumption can not be negative."],
            default: 0
        },
        telemetry: {
            type: ElectricTelemetrySchema
        },
        reason: {
            type: Schema.Types.String
        },
        partner: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Partner',
            default: null
        }
    },
    {
        timestamps: true
    }
);

export type DeviceType = InferSchemaType<typeof DeviceSchema>;

// export const Device = model<IDevice>("Device", DeviceSchema);
export const Device = model("Device", DeviceSchema);

// const MeterTelemetrySchema = new Schema<IMeterTelemetry>(
const MeterTelemetrySchema = new Schema(
    {
        _id: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            uppercase: true,
            // minLength: 30,
            // maxLength: 60,
            // unique: true, // Not required in time series data
            immutable: true
        },
        deviceId: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            uppercase: true,
            minLength: 10,
            maxLength: 20,
            immutable: true
        },
        timeStamp: {
            type: Schema.Types.Date,
            required: true,
            immutable: true
        },
        totalEnergy: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Total energy consumption can not be negative."],
            default: 0,
            immutable: true
        },
        status: {
            type: Schema.Types.Boolean,
            required: true,
            default: false,
            immutable: true
        },
        uptime: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Up time can not be negative."],
            immutable: true
        },
        voltage: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Voltage reading should not be negative."],
            immutable: true
        },
        current: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Current reading should not be negative."],
            immutable: true
        },
        power: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Power should not be negative."],
            immutable: true
        }
    },
    {
        timeseries: {
            timeField: "timeStamp",
            metaField: "deviceId",
            granularity: "minutes" // MongoDB creates a new bucket for every 24 hour period
        }
    }
);

export type MeterTelemetryType = InferSchemaType<typeof MeterTelemetrySchema>;

// export const MeterTelemetry = model<IMeterTelemetry>("MeterTelemetry", MeterTelemetrySchema);
export const MeterTelemetry = model("MeterTelemetry", MeterTelemetrySchema);