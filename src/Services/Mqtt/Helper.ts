import { MongooseError, Error as MongooseErrors, mongo, startSession } from "mongoose";
import mqtt from "mqtt";
import type { IPublishPacket } from "mqtt-packet";
import type { QoS } from "../../Shared/Common/Constants/MqttConstants.js";
import { MeterTelemetryData } from "../../Shared/Data/Models/MqttData.js";
import { MqttIncomingMessage, MqttReceivedDeadLetter } from "../../Shared/Data/MongoDB/Models/MqttMessage.js";
import { streamChunks } from "../../Shared/Data/MongoDB/Helpers/QueryHelpers.js";
import { Device, MeterTelemetry, type IElectricTelemetry } from "../../Shared/Data/MongoDB/Models/Device.js";
import FixedSizeQueue from "../../Shared/Common/Models/FixedSizeQueue.js";
// import { isAnyDataType } from "../../Shared/Common/Helpers/TypeHelpers.js";

class ReceivedMqttIncomingMessageIdManager {
    static #mqttIncomingMessageIds: Set<string> = new Set<string>();

    private constructor() {}

    /**
     * Use before connecting to mqtt
     * @param ids - MqttIncomingMessage._id from database
     */
    public static addIds(ids: string[]): void {
        if (ids && ids.length > 0) {
            if (this.#mqttIncomingMessageIds.size === 0) {
                this.#mqttIncomingMessageIds = new Set<string>(ids);
            }
            else {
                for (const id of ids) {
                    this.#mqttIncomingMessageIds.add(id);
                }
            }
        }
    }

    /** @param id - Id of the received MqttIncomingMessage */
    public static storeId(id: string): void {
        if (id && !this.#mqttIncomingMessageIds.has(id)) {
            this.#mqttIncomingMessageIds.add(id);
        }
    }

    /** @param id - Id of the received MqttIncomingMessage */
    public static hasId(id: string): boolean {
        return this.#mqttIncomingMessageIds.has(id);
    }

    /** @param id - Id of the received MqttIncomingMessage */
    public static removeId(id: string): boolean {
        return this.#mqttIncomingMessageIds.delete(id);
    }
}

class ProcessedMqttIncomingMessageIdManager {
    static #mqttIncomingMessageIds: FixedSizeQueue<string> = new FixedSizeQueue<string>(500);

    private constructor() {}

    /** @param id - Id of the MqttIncomingMessage */
    public static storeId(id: string): void {
        if (id) {
            this.#mqttIncomingMessageIds.enqueue(id);
        }
    }

    /** @param id - Id of the MqttIncomingMessage */
    public static hasId(id: string): boolean {
        return this.#mqttIncomingMessageIds.includes(id);
    }
}

class ProcessingMqttIncomingMessageIdManager {
    static #mqttIncomingMessageIds: Set<string> = new Set<string>();

    private constructor() {}

    /** @param id - Id of the MqttIncomingMessage */
    public static storeId(id: string): void {
        if (id && !this.#mqttIncomingMessageIds.has(id)) {
            this.#mqttIncomingMessageIds.add(id);
        }
    }

    /** @param id - Id of the MqttIncomingMessage */
    public static hasId(id: string): boolean {
        return this.#mqttIncomingMessageIds.has(id);
    }

    /** @param id - Id of the MqttIncomingMessage */
    public static removeId(id: string): boolean {
        return this.#mqttIncomingMessageIds.delete(id);
    }
}

class MqttIncomingMessageIdManager {
    private constructor() {}

    /**
     * @param topic - topic of the MqttIncomingMessage
     * @param qos - QoS level of the MqttIncomingMessage
     * @param messageId - MessageId of the MqttIncomingMessage
     * @param payloadLength - Length of the message or packet payload (packet.payload)
     */
    public static generateId(topic: string, qos: QoS, messageId?: number, payloadLength?: number) {
        return `${topic}|${qos}|${messageId}|${payloadLength}`;
    }

    /** @param id - Id of the MqttIncomingMessage */
    static #getId(id: string): string;
    /**
     * @param topic - topic of the MqttIncomingMessage
     * @param qos - QoS level of the MqttIncomingMessage
     * @param messageId - MessageId of the MqttIncomingMessage
     * @param payloadLength - Length of the message or packet payload (packet.payload)
     */
    static #getId(topic: string, qos: QoS, messageId?: number, payloadLength?: number): string;
    static #getId(topicOrId: string, qos?: QoS, messageId?: number, payloadLength?: number): string {
        if (!(typeof qos === "undefined" && typeof messageId === "undefined" && typeof payloadLength === "undefined")) {
            return this.generateId(topicOrId, qos!, messageId, payloadLength);
        }

        return topicOrId;
    }

    /**
     * @param id - Id of the MqttIncomingMessage
     */
    public static hasId(id: string): boolean;
    /**
     * @param topic - topic of the MqttIncomingMessage
     * @param qos - QoS level of the MqttIncomingMessage
     * @param messageId - MessageId of the MqttIncomingMessage
     * @param payloadLength - Length of the message or packet payload (packet.payload)
     */
    public static hasId(topic: string, qos: QoS, messageId?: number, length?: number): boolean;
    public static hasId(topicOrId: string, qos?: QoS, messageId?: number, length?: number): boolean {
        topicOrId = this.#getId(topicOrId, qos!, messageId, length);

        return ReceivedMqttIncomingMessageIdManager.hasId(topicOrId)
            || ProcessingMqttIncomingMessageIdManager.hasId(topicOrId)
            || ProcessedMqttIncomingMessageIdManager.hasId(topicOrId)
        ;
    }
}

/**
 * Use before connecting to mqtt
 * @param ids - MqttIncomingMessage._id from database
 */
export function initializeMqttIncomingMessageIdStore(ids: string[]): void {
    ReceivedMqttIncomingMessageIdManager.addIds(ids);
}

/**
 * @param topic - topic of the MqttIncomingMessage
 * @param qos - QoS level of the MqttIncomingMessage
 * @param messageId - MessageId of the MqttIncomingMessage
 * @param payloadLength - Length of the message or packet payload (packet.payload)
 */
export const generateMqttIncomingMessageId = MqttIncomingMessageIdManager.generateId;

export const hasMqttIncomingMessageId = MqttIncomingMessageIdManager.hasId;

export const mqttPublishMessagePacketHandler: mqtt.AckHandler = (topic, message, packet: IPublishPacket, callback) => {
    if (packet?.qos == 0) {
        callback(0);
    }
    else {
        handleReceivedMqttIncomingPacketAsync(topic, message, packet)
            .then(
                onfulfilled => {
                    if (onfulfilled) {
                        callback(onfulfilled.error || onfulfilled.reasonCode, onfulfilled.reasonCode);
                    }
                },
                onrejected => {
                    if (onrejected instanceof Error) {
                        callback(onrejected, 128);
                    }
                    else {
                        callback(128);
                    }
                }
            )
        ;
    }
}

interface IReceivedMqttIncomingPacketHandlerResult {
    error: Error | null,
    reasonCode: keyof typeof mqtt.ReasonCodes
}

async function handleReceivedMqttIncomingPacketAsync(topic: string, message: Buffer<ArrayBufferLike>, packet: IPublishPacket): Promise<IReceivedMqttIncomingPacketHandlerResult> {
    const result: IReceivedMqttIncomingPacketHandlerResult = { error: null, reasonCode: 0 };
    try {
        const id = MqttIncomingMessageIdManager.generateId(topic, packet.qos, packet.messageId, message?.length);
        if (packet.dup === true && (ReceivedMqttIncomingMessageIdManager.hasId(id) || ProcessedMqttIncomingMessageIdManager.hasId(id) || await existsMqttIncomingPacketInDbAsync(id))) {
            // Received duplicate packet
            // result.reasonCode = 145;
            result.reasonCode = 0;
        }
        else {
            await saveReceivedMqttIncomingPacketAsync(id, topic, message, packet);
            ReceivedMqttIncomingMessageIdManager.storeId(id);
        }
    }
    catch (error) {
        result.reasonCode = 128;
        try {
            if (typeof error === "object" && error && error instanceof Error) {
                result.error = error;
                console.error(error, "Failed to store received mqtt packet.", "Error:", error.message, "Input:", { topic, message, packet });

                if (error instanceof MongooseError) {
                    if (error instanceof MongooseErrors.CastError
                        || error instanceof MongooseErrors.ValidationError
                        || error instanceof MongooseErrors.DivergentArrayError)
                    {
                        await saveReceivedInvalidPacketAsync(topic, packet, error);

                        result.error = null;
                        result.reasonCode = 0;
                    }
                    else if (error instanceof MongooseErrors.ParallelSaveError
                        || error instanceof MongooseErrors.MongooseServerSelectionError
                        || error instanceof MongooseErrors.StrictModeError
                        || error instanceof MongooseErrors.StrictPopulateError)
                    {
                        result.reasonCode = 131;
                    }
                }
                else if (error instanceof mongo.MongoError) {
                    if (error instanceof mongo.MongoServerError && error.code == 11000) {
                        // result.reasonCode = 145; // TODO: Temporarily disabled. Before enabling, Restrict access to creating indexes in the database to prevent logic from being accidentally broken.
                        result.reasonCode = 131;
                    }
                    else if (error instanceof mongo.MongoNotConnectedError
                        || error instanceof mongo.MongoTopologyClosedError
                        || error instanceof mongo.MongoServerSelectionError
                        || error instanceof mongo.MongoNetworkTimeoutError)
                    {
                        result.reasonCode = 131;
                    }
                }
            }
            else {
                console.error(error, "Failed to store received mqtt packet due to unexpected error", "Input:", { topic, message, packet });
            }
        }
        catch (error2) {
            console.error(error2, "Failed to handle error occurred while storing received mqtt packet or failed in further processing by mqtt library.", "Storing Error:", error);

            if (typeof error2 === "object" && error2 && error2 instanceof Error) {
                result.error = error2;
            }
        }
    }

    return result;
}

async function existsMqttIncomingPacketInDbAsync(id: string): Promise<boolean> {
    const response = await MqttIncomingMessage.exists({ _id: id }).exec();

    return response?._id == id;
}

async function saveReceivedMqttIncomingPacketAsync(id: string, topic: string, message: Buffer<ArrayBufferLike>, packet: IPublishPacket): Promise<boolean> {
    const incomingMessage = new MqttIncomingMessage({ _id: id, topic, packet });
    // incomingMessage.packet.payload = message;

    return (await incomingMessage.save()) != null;
}

async function saveReceivedInvalidPacketAsync(topic: string, packet: unknown, reason?: Error | string): Promise<void> {
    try {
        const deadLetter = new MqttReceivedDeadLetter(
            {
                topic: topic,
                packet: packet,
                reason: reason ?? undefined
            }
        );
        await deadLetter.save();
    }
    catch (error) {
        console.error(error, "Failed to save received MQTT packet to dead letters.", "Input:", { topic, packet, reason });
    }
}

export const mqttOnMessageEventProcessingHandler: mqtt.OnMessageCallback = async (topic: string, payload: Buffer<ArrayBufferLike>, packet: IPublishPacket) => {
    await processIncommingMessage(topic, payload, packet);
};

async function processIncommingMessage(topic: string, payload: Buffer<ArrayBufferLike>, packet: IPublishPacket, mqttIncomingMessageId: string = ""): Promise<void> {
    try {
        if (mqttIncomingMessageId === "") {
            mqttIncomingMessageId = MqttIncomingMessageIdManager.generateId(topic, packet.qos, packet.messageId, payload?.length);
        }

        if (ProcessingMqttIncomingMessageIdManager.hasId(mqttIncomingMessageId)) {
            return;
        }
        ProcessingMqttIncomingMessageIdManager.storeId(mqttIncomingMessageId);

        if (!ProcessedMqttIncomingMessageIdManager.hasId(mqttIncomingMessageId)) {
            if (topic == "meter/telemetry") {
                await processMeterTelemetry(mqttIncomingMessageId, topic, payload, packet);
            }

            ProcessedMqttIncomingMessageIdManager.storeId(mqttIncomingMessageId);
        }

        ProcessingMqttIncomingMessageIdManager.removeId(mqttIncomingMessageId);
        ReceivedMqttIncomingMessageIdManager.removeId(mqttIncomingMessageId);
    }
    catch (error) {
        console.error(error, `Something went wrong while processing received mqtt packet with id: ${mqttIncomingMessageId}`);
    }
}

function generateMeterTelemetryId(deviceId: string, timeStamp: Date): string {
    return `${deviceId}|${timeStamp?.toISOString()}`;
}

function getMeterTelemetryData(payload: Buffer<ArrayBufferLike>): [MeterTelemetryData, null] | [null, NonNullable<unknown>] {
    try {
        return [new MeterTelemetryData(JSON.parse(payload.toString())), null];
    }
    catch (error) {
        return [null, error || new Error("Null error in function getMeterTelemetryData")];
    }
}

// async function removeReceivedMqttIncomingPacketAsync(mqttIncomingMessageId: string): Promise<void> {
//     try {
//         await MqttIncomingMessage.deleteOne({ _id: mqttIncomingMessageId }).exec();
//         ReceivedMqttIncomingMessageIdManager.removeId(mqttIncomingMessageId);
//     }
//     catch (error) {
//         if (typeof error === "object" && error && error instanceof Error) {
//             console.error(error, `Failed to remove received mqtt packet with id: ${mqttIncomingMessageId}`, "Error:", error.message);
//         }
//         else {
//             console.error(error, `Failed to remove received mqtt packet with id: ${mqttIncomingMessageId}`);
//         }
//     }
// }

async function invalidateReceivedMqttIncomingPacketAsync(mqttIncomingMessageId: string, topic: string, packet: IPublishPacket, reason?: Error | string): Promise<void> {
    let mongooseSession: mongo.ClientSession | null = null;
    try {
        mongooseSession = await startSession();
        await mongooseSession.withTransaction(
            async () => {
                await MqttReceivedDeadLetter.create(
                    {
                        topic: topic,
                        packet: packet,
                        reason: reason ?? undefined
                    },
                    { session: mongooseSession }
                );

                await MqttIncomingMessage.deleteOne(
                    { _id: mqttIncomingMessageId },
                    { session: mongooseSession! }
                ).exec();
            }
        );
        // ReceivedMqttIncomingMessageIdManager.removeId(mqttIncomingMessageId);
    }
    catch (error) {
        if (typeof error === "object" && error && error instanceof Error) {
            console.error(error, `Failed to move received mqtt packet to invalid with id: ${mqttIncomingMessageId}`, "Error:", error.message);
        }
        else {
            console.error(error, `Failed to move received mqtt packet to invalid with id: ${mqttIncomingMessageId}`);
        }
    }
    finally {
        if (mongooseSession) {
            mongooseSession.endSession();
        }
    }
}

async function processMeterTelemetry(mqttIncomingMessageId: string, topic: string, payload: Buffer<ArrayBufferLike>, packet: IPublishPacket): Promise<void> {
    let mongooseSession: mongo.ClientSession | null = null;
    try {
        const [telemetryData, telemetryDataError] = getMeterTelemetryData(payload);
        if (telemetryDataError || !telemetryData) {
            if (typeof telemetryDataError === "object" && telemetryDataError && telemetryDataError instanceof Error) {
                console.error(telemetryDataError, `Failed to read meter telemetry data from received mqtt packet payload with id: ${mqttIncomingMessageId}`, "Error:", telemetryDataError.message);
                // await saveReceivedInvalidPacketAsync(topic, packet, telemetryDataError);
                await invalidateReceivedMqttIncomingPacketAsync(mqttIncomingMessageId, topic, packet, telemetryDataError);
            }
            else {
                console.error(telemetryDataError, `Failed to read meter telemetry data from received mqtt packet payload with id: ${mqttIncomingMessageId}`);
                // await saveReceivedInvalidPacketAsync(topic, packet, telemetryDataError.toString());
                // if (isAnyDataType(telemetryDataError) && typeof telemetryDataError !== "undefined" && telemetryDataError != null) {
                //     await saveReceivedInvalidPacketAsync(topic, packet, telemetryDataError.toString());
                // }
                // else {
                //     await saveReceivedInvalidPacketAsync(topic, packet, "Unknown error");
                // }
                await invalidateReceivedMqttIncomingPacketAsync(mqttIncomingMessageId, topic, packet, telemetryDataError.toString());
            }
            // await removeReceivedMqttIncomingPacketAsync(mqttIncomingMessageId);

            return;
        }

        const meterTelemetry = new MeterTelemetry({
            _id: generateMeterTelemetryId(telemetryData.deviceId, telemetryData.timeStamp),
            deviceId: telemetryData.deviceId,
            timeStamp: telemetryData.timeStamp,
            totalEnergy: telemetryData.totalEnergy,
            status: telemetryData.status,
            uptime: telemetryData.uptime,
            voltage: telemetryData.voltage,
            current: telemetryData.current,
            power: telemetryData.power
        });
        await meterTelemetry.validate();

        const deviceTelemetry: IElectricTelemetry = {
            voltage: telemetryData.voltage,
            current: telemetryData.current,
            power: telemetryData.power,
            timeStamp: telemetryData.timeStamp
        };

        mongooseSession = await startSession();
        await mongooseSession.withTransaction(
            async () => {
                await meterTelemetry.save(
                    { session: mongooseSession }
                );

                await Device.updateOne(
                    {
                        _id: telemetryData.deviceId,
                        $or: [
                            { telemetry: { $exists: false } },
                            { telemetry: { $in: [undefined, null] } },
                            { "telemetry.timeStamp": { $lt: deviceTelemetry.timeStamp } }
                        ]
                    },
                    {
                        $set: {
                            telemetry: deviceTelemetry
                        }
                    },
                    { session: mongooseSession! }
                ).exec();

                await MqttIncomingMessage.deleteOne(
                    { _id: mqttIncomingMessageId },
                    { session: mongooseSession! }
                ).exec();
            }
        );
    }
    catch (error) {
        if (typeof error === "object" && error && error instanceof Error) {
            console.error(error, `Failed to process meter telemetry for received mqtt packet payload with id: ${mqttIncomingMessageId}`, "Error:", error.message, "Input:", { topic, payload, packet });
            if (error instanceof MongooseError
                && (error instanceof MongooseErrors.CastError
                    || error instanceof MongooseErrors.ValidationError
                    || error instanceof MongooseErrors.DivergentArrayError
                ))
            {
                await invalidateReceivedMqttIncomingPacketAsync(mqttIncomingMessageId, topic, packet, error);
            }
        }
        else {
            console.error(error, `Failed to process meter telemetry for received mqtt packet payload with id: ${mqttIncomingMessageId}`, "Input:", { topic, payload, packet });
        }
    }
    finally {
        if (mongooseSession) {
            mongooseSession.endSession();
        }
    }
}

export async function processSavedIncommingMessages(tillDateTime?: Date): Promise<void> {
    let attemps: number = 0;
    let keepProcessing = true;
    if (!tillDateTime) {
        tillDateTime = new Date();
    }

    do {
        try {
            for await (const docs of streamChunks(MqttIncomingMessage, { savedInDbAt: { $lt: tillDateTime } }, {}, { batchSize: 1000, lean: true })) {
                for (const doc of docs) {
                    await processIncommingMessage(doc.topic, doc.packet.payload, doc.packet as IPublishPacket, doc._id);
                }
            }

            keepProcessing = false;
            console.info(`Processed saved mqtt packets till ${tillDateTime.toISOString()}`);
        }
        catch (error) {
            const tillDateTimeString = tillDateTime.toISOString();
            if (typeof error === "object" && error && error instanceof Error) {
                console.error(error, `Something went wrong while processing saved mqtt packets till ${tillDateTimeString}`, "Error:", error.message);
            }
            else {
                console.error(error, `Something went wrong while processing saved mqtt packets till ${tillDateTimeString}`);
            }

            const remainingDocCount = await MqttIncomingMessage.countDocuments({ savedInDbAt: { $lt: tillDateTime } }).exec();

            if (remainingDocCount > 0) {
                if (attemps++ < 3) {
                    console.info(`Restarting processing saved mqtt packets till ${tillDateTimeString}. Restart Attempt: ${attemps - 1} Remaining Documents: ${remainingDocCount}`);
                }
                else {
                    keepProcessing = false;
                    console.warn(`Exceeded restart attempts for processing saved mqtt packets till ${tillDateTimeString}. Remaining Documents: ${remainingDocCount}`);
                }
            }
            else {
                keepProcessing = false;
                console.info(`No documents to restart processing saved mqtt packets till ${tillDateTimeString}.`);
            }
        }
    }
    while (keepProcessing);
}