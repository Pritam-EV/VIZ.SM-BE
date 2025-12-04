import { MqttClient } from "mqtt";
import MqttConnection from "./Connection.js";
import { processSavedIncommingMessages } from "./Helper.js";

export default class MqttService {
    private constructor() {}

    /**
     * get MQTT client
    */
    public static get client(): MqttClient {
        return MqttConnection.client;
    }

    public static async startProcessingIncommingMessages(): Promise<void> {
        processSavedIncommingMessages(new Date());
    }
}