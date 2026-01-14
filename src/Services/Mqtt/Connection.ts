import mqtt from "mqtt";
import { isMap, isSet } from "node:util/types";
import { mqttOnMessageEventProcessingHandler, mqttPublishMessagePacketHandler } from "./Helper.js";
import { type QoS, MqttQoSLevels } from "../../Shared/Common/Constants/MqttConstants.js";
import { ArgumentError } from "../../Shared/Common/CustomErrors/Errors.js";
import { isIterable } from "../../Shared/Common/Helpers/TypeHelpers.js";

interface ISubscriptionTopicArrayWithOptions {
    topics: string[];
    options: mqtt.IClientSubscribeOptions;
    resubscribe?: boolean;
}

interface ISubscriptionTopicMap {
    topics: mqtt.ISubscriptionMap;
    options?: mqtt.IClientSubscribeOptions | mqtt.IClientSubscribeProperties;
}

interface ISubscriptionRequestGrantDetails {
    [topic: string]: {
        request: mqtt.IClientSubscribeOptions,
        grant?: mqtt.ISubscriptionGrant
    }
}

/**
 * @todo Use secure connection
 */
export default class MqttConnection {
    static #client: mqtt.MqttClient;
    static #subscriptionData: ISubscriptionTopicArrayWithOptions | ISubscriptionTopicMap;
    static #subscriptionRequestDetails: mqtt.ISubscriptionMap;

    private constructor() {}

    public static get client(): mqtt.MqttClient {
        if (!this.#client) {
            this.#client = mqtt.connect(
                process.env.MQTT_BROKER_URL,
                {
                    protocol: "wss",
                    username: process.env.MQTT_BROKER_USERNAME,
                    password: process.env.MQTT_BROKER_PASSWORD,
                    rejectUnauthorized: false, // TODO: Not recommended for production. Use secure connection.
                    clientId: process.env.MQTT_CLIENT_ID!,
                    clean: process.env.MQTT_CLIENT_ID ? false : true,
                    connectTimeout:
                        process.env.MQTT_CONNECT_TIMEOUT && Number.isFinite(Number(process.env.MQTT_CONNECT_TIMEOUT))
                        ? Number(process.env.MQTT_CONNECT_TIMEOUT)
                        : 10000,
                    reconnectPeriod:
                        process.env.MQTT_RECONNECT_PERIOD && Number.isFinite(Number(process.env.MQTT_CONNECT_TIMEOUT))
                        ? Number(process.env.MQTT_RECONNECT_PERIOD)
                        : 1000,
                    resubscribe: true,
                    protocolVersion: 5,
                    protocolId: "MQTT",
                    properties: {
                        sessionExpiryInterval: 8640000, // 100 days
                        receiveMaximum: 100 // TODO: This value is low due to limitations of free MongoDb. Increase after upgrading resouces.
                    },
                    customHandleAcks: mqttPublishMessagePacketHandler
                }
            );

            this.#subscribeConnectionEvents();
        }

        return this.#client;
    }

    static #subscribeConnectionEvents() {
        if (this.#client) {
            this.#client.on("connect", (connack) => {
                console.info("✅ MQTT connected");
                if ((!connack.sessionPresent) && this.#subscriptionData) {
                    this.#subscribeTopics(false)
                        .catch((error) => {
                            console.error(error, "Failed to subscribe device topics");
                        })
                    ;
                }
            });

            this.#client.on("message", mqttOnMessageEventProcessingHandler);

            this.#client.on("reconnect", () => {
                console.info("♻️  MQTT reconnecting...");
            });

            this.#client.on("close", () => {
                console.warn("❌ MQTT disconnected");
            });

            this.#client.on("disconnect", () => {
                console.warn("❌ MQTT received disconnect packet from broker");
            });

            this.#client.on("offline", () => {
                console.warn("⚠️ MQTT client is offline");
            });

            this.#client.on("error", (error) => {
                console.error(error, `❌ MQTT error: ${error.message}`);
            });
        }
        else {
            throw new TypeError("Cannot subscribe events of null or undefined MQTT client");
        }
    }

    static async #subscribeTopics(isInitialSetup: boolean = true) {
        try {
            if (isInitialSetup) {
                const topicCount: number = getTopicCountInSubscriptionMap(this.#subscriptionRequestDetails);
                if (topicCount > 0) {
                    console.info(`Subscribing ${topicCount} MQTT topics`);
                }
                else {
                    console.info("No MQTT topics to subscribe.");
                }
            }

            if (this.#subscriptionData && this.#subscriptionData.topics) {
                const subscriptionGrants =
                    typeof this.#subscriptionData.options === "object" && this.#subscriptionData.options
                    ? await this.#client.subscribeAsync(this.#subscriptionData.topics, this.#subscriptionData.options)
                    : await this.#client.subscribeAsync(this.#subscriptionData.topics)
                ;

                console.info("Subscribed MQTT topics.", "Grant details:", subscriptionGrants);

                if (subscriptionGrants && subscriptionGrants.length > 0) {
                    if (isInitialSetup) {
                        const subscribedDetails = buildSubscriptionDetails(this.#subscriptionRequestDetails, subscriptionGrants);
                        console.info("MQTT subscription details.", "Details:", subscribedDetails);
                        if (subscribedDetails) {
                            for (const topic of Object.keys(subscribedDetails)) {
                                const topicSubscribedDetails = subscribedDetails[topic];
                                if (topicSubscribedDetails && topicSubscribedDetails.request) {
                                    if (topicSubscribedDetails.grant) {
                                        if (!MqttQoSLevels.includes(topicSubscribedDetails.grant.qos as QoS)) {
                                            console.error("MQTT subscription rejected.", `Topic: ${topic}`, "Subscription Details:", topicSubscribedDetails);
                                        }
                                        else if (topicSubscribedDetails.request.qos != topicSubscribedDetails.grant.qos) {
                                            if (topicSubscribedDetails.request.qos > topicSubscribedDetails.grant.qos) {
                                                console.warn(`MQTT subscription downgraded for topic ${topic} from ${topicSubscribedDetails.request.qos} to ${topicSubscribedDetails.grant.qos}`);
                                            }
                                        }
                                    }
                                    else {
                                        console.error(`MQTT subscription is not granted for topic ${topic}`);
                                    }
                                }
                            }
                        }
                        else {
                            console.error("Failed to build subscribed details.");
                        }
                    }
                    else {
                        const nonGratedTopicCount = subscriptionGrants.filter(subscriptionGrant => !MqttQoSLevels.includes(subscriptionGrant.qos as QoS));
                        if (nonGratedTopicCount && nonGratedTopicCount.length > 0) {
                            console.error("MQTT subscription is not granted for some topics.", nonGratedTopicCount);
                        }
                    }
                }
                else {
                    console.error("Non of MQTT subscription granted.");
                }
            }
        }
        catch (error) {
            console.error(error, "Failed while subscribing MQTT topics.");
            if (isInitialSetup) {
                throw error;
            }
        }
    }

    /**
     * Creates connection and subscribes given topics
     * @param topics - Topics to subscribe
     * @param options - subscription options
     */
    public static async configureAsync(subscriptionData?: ISubscriptionTopicArrayWithOptions): Promise<mqtt.MqttClient>;
    public static async configureAsync(subscriptionData?: ISubscriptionTopicMap): Promise<mqtt.MqttClient>;
    public static async configureAsync(subscriptionData?: ISubscriptionTopicArrayWithOptions | ISubscriptionTopicMap): Promise<mqtt.MqttClient> {
        if (typeof subscriptionData === "object" && subscriptionData && subscriptionData.topics) {
            let subscriptionMap: mqtt.ISubscriptionMap | undefined;
            if (Array.isArray(subscriptionData.topics)) {
                subscriptionMap = buildSubscriptionMap(subscriptionData as ISubscriptionTopicArrayWithOptions);
            }
            else {
                subscriptionMap = buildSubscriptionMap(subscriptionData as ISubscriptionTopicMap);
            }
            if (subscriptionMap) {
                const topicCount: number = getTopicCountInSubscriptionMap(subscriptionMap);
                if (topicCount > 0) {
                    this.#subscriptionData = subscriptionData;
                    this.#subscriptionRequestDetails = subscriptionMap;
                }
            }
        }

        const client = this.client;
        await this.#subscribeTopics(true);

        return client;
    }
}

function buildSubscriptionDetails(subscriptionMap?: mqtt.ISubscriptionMap, subscriptionGrants?: mqtt.ISubscriptionGrant[]): ISubscriptionRequestGrantDetails | undefined {
    if (!(subscriptionMap || subscriptionGrants)) {
        return undefined;
    }

    const subscriptionDetails: ISubscriptionRequestGrantDetails = {};

    if (subscriptionMap) {
        for (const key of Object.keys(subscriptionMap)) {
            if (subscriptionMap[key] && "qos" in subscriptionMap[key]) {
                subscriptionDetails[key] = { request: subscriptionMap[key] };
            }
        }
    }

    if (subscriptionGrants && subscriptionGrants.length > 0) {
        subscriptionGrants.forEach(subscriptionGrant => {
            if (typeof subscriptionDetails[subscriptionGrant.topic] === "object" && subscriptionDetails[subscriptionGrant.topic]) {
                (subscriptionDetails[subscriptionGrant.topic]!).grant = subscriptionGrant;
            }
        });
    }

    return subscriptionDetails;
}

function getTopicCountInSubscriptionMap(subscriptionMap?: mqtt.ISubscriptionMap): number {
    let topicCount: number = 0;
    if (subscriptionMap) {
        for (const key of Object.keys(subscriptionMap)) {
            if (subscriptionMap[key] && "qos" in subscriptionMap[key]) {
                topicCount++;
            }
        }
    }

    return topicCount;
}

function buildSubscriptionMap(subscriptionData?: ISubscriptionTopicArrayWithOptions): mqtt.ISubscriptionMap | undefined;
function buildSubscriptionMap(subscriptionData?: ISubscriptionTopicMap): mqtt.ISubscriptionMap | undefined;
function buildSubscriptionMap(subscriptionData?: ISubscriptionTopicArrayWithOptions | ISubscriptionTopicMap): mqtt.ISubscriptionMap | undefined {
    if (!(subscriptionData && subscriptionData.topics)) {
        return undefined;
    }

    if (Array.isArray(subscriptionData.topics)) {
        if (subscriptionData.topics.length < 1) {
            return undefined;
        }
        if (!isValidSubscriptionOptions(subscriptionData.options)) {
            throw new ArgumentError("subscriptionData", "subscriptionData.options.qos is required with MQTT topics array for subscription.");
        }

        const subscriptionMap: mqtt.ISubscriptionMap = {};
        for (const topic of subscriptionData.topics) {
            if (!isValidSubscriptionTopic(topic)) {
                throw new ArgumentError("subscriptionData", "subscriptionData.topics must contain valid topic strings.");
            }

            subscriptionMap[topic] = subscriptionData.options;
        }

        if ("resubscribe" in subscriptionData && typeof subscriptionData.resubscribe === "boolean") {
            subscriptionMap.resubscribe = subscriptionData.resubscribe;
        }

        return subscriptionMap;
    }
    else {
        const subscriptionMap: mqtt.ISubscriptionMap = structuredClone(subscriptionData.topics);
        for (const key of Object.keys(subscriptionMap)) {
            if (subscriptionMap[key] && "qos" in subscriptionMap[key]) {
                if (!isValidSubscriptionTopic(key)) {
                    throw new ArgumentError("subscriptionData", "subscriptionData.topics must contain valid topic strings.");
                }
                if (!isValidSubscriptionOptions(subscriptionMap[key])) {
                    throw new ArgumentError("subscriptionData", "MQTT topic of mqtt.ISubscriptionMap in subscriptionData.topics requires valid QoS subscriptionMap[topic].qos for subscription.");
                }
                if (subscriptionData.options) {
                    subscriptionMap[key] = assignValueIfUnspecified(subscriptionMap[key], subscriptionData.options);
                }
            }
        }

        return subscriptionMap;
    }
}

function isValidSubscriptionTopic(topic: unknown): topic is string {
    if (!(topic && typeof topic === "string")) {
        return false;
    }

    const parts = topic.split("/");
    for (let i = 0; i < parts.length; i++) {
        if (!parts[i]) {
            return false;
        }

        if (parts[i] === "+") {
            continue;
        }

        if (parts[i] === "#") {
            return i === parts.length - 1;
        }

        if ((parts[i] as string).indexOf("+") !== -1 || (parts[i] as string).indexOf("#") !== -1) {
            return false;
        }
    }

    return true;
}

function isValidSubscriptionOptions(options: unknown): options is mqtt.IClientSubscribeOptions {
    if (typeof options !== "object" || options == null) {
        return false;
    }

    return "qos" in options && typeof options.qos === "number" && MqttQoSLevels.includes(options.qos as QoS);
}

function assignValueIfUnspecified<TMain, TRef>(mainObj: TMain, refObj: TRef): TMain {
    if (typeof refObj !== "undefined" && refObj !== null) {
        if (typeof mainObj === "undefined" || mainObj === null) {
            mainObj = refObj as TMain;
        }
        else if (typeof refObj === "number" && typeof mainObj === "number" && Number.isFinite(refObj) && !Number.isFinite(mainObj)) {
            mainObj = refObj as TMain;
        }
        else if (typeof refObj === "object" && typeof mainObj === "object") {
            // Iterable object like Array, Set, Map, ...
            if (isIterable(refObj) && isIterable(mainObj)) {
                const refObjArray = [...refObj];
                if (refObjArray.length > 0) {
                    if (isMap(mainObj)) {
                        if (mainObj instanceof Map && refObjArray.every(refObjArrayItem => (!refObjArrayItem) || (Array.isArray(refObjArrayItem) && refObjArrayItem.length === 2))) {
                            for (const refObjArrayItem of refObjArray) {
                                if (refObjArrayItem && refObjArrayItem[0 as keyof object] && !mainObj.has(refObjArrayItem[0 as keyof object])) {
                                    mainObj.set(refObjArrayItem[0 as keyof object], refObjArrayItem[1 as keyof object]);
                                }
                            }
                        }
                        // TODO: handle custom properties
                    }
                    else if (isSet(mainObj)) {
                        if (mainObj instanceof Set) {
                            for (const refObjArrayItem of refObjArray) {
                                if (refObjArrayItem && !mainObj.has(refObjArrayItem)) {
                                    mainObj.add(refObjArrayItem);
                                }
                            }
                        }
                        // TODO: handle custom properties
                    }
                    else if (Array.isArray(mainObj)) {
                        for (const refObjArrayItem of refObjArray) {
                            if (refObjArrayItem && !mainObj.includes(refObjArrayItem)) {
                                mainObj.push(refObjArrayItem);
                            }
                        }
                    }
                    else if (([...mainObj]).length < 1) {
                        mainObj = refObj as TMain;
                    }
                    // else {} // TODO: handle custom iterable
                }
            }
            else {
                // for capture all properties 
                // use Object.getOwnPropertyNames() 
                // and move up the prototype chain with Object.getPrototypeOf()
                const refObjKeys = Object.keys(refObj);
                if (refObjKeys.length > 0) {
                    for (const key of refObjKeys) {
                        assignValueIfUnspecified(mainObj[key as keyof object], refObj[key as keyof object]);
                    }
                }
            }
        }
    }

    return mainObj;
}