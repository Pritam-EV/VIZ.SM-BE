import { AlertTypes } from "../Enums/AlertTypes.js";

export { AlertTypes };

/**
 * Basic response with message
 */
interface IBaseMessageResponse {
    message: string;
}

/**
 * Basic response with message
 */
export class BaseMessageResponse implements IBaseMessageResponse {
    message: string;

    /**
     * @param message - Message to send
     */
    public constructor(message: string) {
        this.message = message;
    }
}

/**
 * Alert view
*/
interface IAlert {
    type: AlertTypes;
    message: string;
}

/**
 * Alert view
 */
export class Alert implements IAlert {
    type: AlertTypes;
    message: string;

    /**
     * @param alertMessage - Message to display
     * @param alertType - Alert type
     */
    public constructor(alertMessage: string, alertType: AlertTypes) {
        this.type = alertMessage && alertMessage != "" ? alertType : AlertTypes.None;
        this.message = alertMessage;
    }
}

export class AlertsResponse {
    alerts : Alert[];

    /**
     * @param alerts - Alerts to display
     */
    public constructor(...alerts: Alert[]) {
        this.alerts = alerts;
    }
}