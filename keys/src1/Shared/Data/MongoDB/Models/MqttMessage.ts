import { Schema, model } from "mongoose";
// import type { IPublishPacket } from "mqtt";
import { MqttQoSLevels, PublishPacketCommand } from "../../../Common/Constants/MqttConstants.js";

// interface IMqttPublishPacket extends IPublishPacket {
//     savedInDbAt: Date;
// }

const MqttPublishPacketPropertiesSchema = new Schema(
    {
        payloadFormatIndicator: {
            type: Schema.Types.Boolean,
            immutable: true
        },
        messageExpiryInterval: {
            type: Schema.Types.Number,
            immutable: true
        },
        topicAlias: {
            type: Schema.Types.Number,
            immutable: true
        },
        responseTopic: {
            type: Schema.Types.String,
            immutable: true
        },
        correlationData: {
            type: Schema.Types.Buffer,
            immutable: true
        },
        userProperties: {
            type: Schema.Types.Mixed,
            immutable: true
        },
        subscriptionIdentifier: {
            type: Schema.Types.Mixed,
            immutable: true
        },
        contentType: {
            type: Schema.Types.String,
            immutable: true
        }
    },
    {
        _id: false,
        strict: false
    }
);

const MqttPublishPacketSchema = new Schema(
    {
        cmd: {
            type: Schema.Types.String,
            required: true,
            enum: Object.values([PublishPacketCommand]), // TODO: Apply command validation, temporarily excluded
            immutable: true
        },
        topic: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            minLength: 5,
            immutable: true
        },
        qos: {
            type: Schema.Types.Number,
            required: true,
            enum: MqttQoSLevels,
            immutable: true
        },
        payload: {
            type: Schema.Types.Buffer,
            required: true,
            immutable: true
        },
        messageId: {
            type: Schema.Types.Number,
            immutable: true
        },
        length: {
            type: Schema.Types.Number,
            immutable: true
        },
        dup: {
            type: Schema.Types.Boolean,
            required: true,
            default: false,
            immutable: true
        },
        retain: {
            type: Schema.Types.Boolean,
            required: true,
            default: false,
            immutable: true
        },
        properties: {
            type: MqttPublishPacketPropertiesSchema,
            immutable: true
        }
    },
    {
        _id: false,
        strict: false
    }
);

const MqttIncomingPublishPacketSchema = new Schema(
    {
        _id: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            uppercase: true,
            minLength: 7,
            // unique: true, // implicit
            immutable: true
        },
        topic: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            minLength: 5,
            immutable: true
        },
        packet: {
            type: MqttPublishPacketSchema,
            required: true,
            immutable: true
        },
        savedInDbAt: {
            type: Schema.Types.Date,
            required: true,
            default: Date.now,
            immutable: true
        }
    }
);

export const MqttIncomingMessage = model("MqttIncomingMessage", MqttIncomingPublishPacketSchema);

interface IMqttDeadLetter {
    topic?: string;
    packet?: unknown;
    reason?: unknown;
}

const MqttDeadLetterSchema = new Schema<IMqttDeadLetter>(
    {
        topic: {
            type: Schema.Types.String,
            immutable: true
        },
        packet: {
            type: Schema.Types.Mixed,
            immutable: true
        },
        reason: {
            type: Schema.Types.Mixed
        }
    },
    {
        strict: false
    }
);

export const MqttReceivedDeadLetter = model("MqttReceivedDeadLetter", MqttDeadLetterSchema);