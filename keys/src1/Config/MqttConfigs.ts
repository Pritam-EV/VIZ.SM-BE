import MqttConnection from "../Services/Mqtt/Connection.js";
import { MqttIncomingMessage } from "../Shared/Data/MongoDB/Models/MqttMessage.js";
import { initializeMqttIncomingMessageIdStore } from "../Services/Mqtt/Helper.js";

export default async function configureAsync() {
    // TODO: Implement robust verification
    if (!(process.env.MQTT_BROKER_URL && process.env.MQTT_CLIENT_ID)) {
        throw new TypeError("Missing required details for persistent connection and client session.");
    }

    const recentMqttIncomingMessageIds = await MqttIncomingMessage.find({})
        .sort({ savedInDbAt: -1 })
        .select("_id")
        .limit(250)
        .lean()
        .exec()
    ;
    if (recentMqttIncomingMessageIds && recentMqttIncomingMessageIds.length > 0) {
        initializeMqttIncomingMessageIdStore(recentMqttIncomingMessageIds.map(element => element._id));
    }

    const deviceTopics = [
        // "device/+/RelayState",
        // "device/+/session/info",
        // "device/+/session/live",
        // "device/+/session/end",
        // "device/+/status",
        // "device/+/Status",
        "meter/telemetry"
    ];

    await MqttConnection.configureAsync({ topics: deviceTopics, options: { qos: 1 } });
}