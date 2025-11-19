import type { QoS, PacketCmd } from "mqtt-packet";

export type { QoS };
    
export const MqttQoSLevels: readonly QoS[] = Object.freeze([0, 1, 2]);

// export const PacketCommand: readonly PacketCmd[] = Object.freeze(["auth", "connack", "connect", "disconnect", "pingreq", "pingresp", "puback", "pubcomp", "publish", "pubrel", "pubrec", "suback", "subscribe", "unsuback", "unsubscribe"]);

type PublishPacketCmd = PacketCmd & "publish";
export const PublishPacketCommand: PublishPacketCmd = "publish";