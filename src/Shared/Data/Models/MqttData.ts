import { ArgumentError, ArgumentNullError } from "../../Common/CustomErrors/Errors.js";
import { hasData } from "../../Common/Helpers/DataHelpers.js";

export class MeterTelemetryData {
    deviceId: string;
    voltage: number;
    current: number;
    power: number;
    totalEnergy: number;
    timeStamp: Date;
    status: boolean;
    uptime: number;

    public constructor(jsonData: object) {
        if (typeof jsonData === "undefined" || (typeof jsonData === "object" && !jsonData)) {
            throw new ArgumentNullError("jsonData", "json data is required for meter telemetry.");
        }
        else if (typeof jsonData !== "object") {
            throw new TypeError(`Invalid data type provided for meter telemetry. Expected: object, Actual: ${typeof jsonData}`);
        }

        if ("DeviceId" in jsonData) {
            if (typeof jsonData.DeviceId !== "string" || jsonData.DeviceId.length < 10) {
                throw new ArgumentError("DeviceId", "DeviceId must be valid in meter telemetry.");
            }
            this.deviceId = jsonData.DeviceId
        }
        else {
            throw new ArgumentError("DeviceId", "DeviceId is required in meter telemetry.");
        }

        this.voltage = 0;
        if ("Voltage" in jsonData && hasData(jsonData.Voltage)) {
            this.voltage = Number(jsonData.Voltage);
            if (!(Number.isFinite(this.voltage) && this.voltage >= 0)) {
                throw new ArgumentError("Voltage", "Voltage must be valid in meter telemetry.");
            }
        }

        this.current = 0;
        if ("Current" in jsonData && hasData(jsonData.Current)) {
            this.current = Number(jsonData.Current);
            if (!(Number.isFinite(this.current) && this.current >= 0)) {
                throw new ArgumentError("Current", "Current must be valid in meter telemetry.");
            }
        }

        this.power = 0;
        if ("Power" in jsonData && hasData(jsonData.Power)) {
            this.power = Number(jsonData.Power);
            if (!(Number.isFinite(this.power) && this.power >= 0)) {
                throw new ArgumentError("Power", "Power must be valid in meter telemetry.");
            }
        }

        if ("TotalEnergy" in jsonData && hasData(jsonData.TotalEnergy)) {
            this.totalEnergy = Number(jsonData.TotalEnergy);
            if (!(Number.isFinite(this.totalEnergy) && this.totalEnergy >= 0)) {
                throw new ArgumentError("TotalEnergy", "TotalEnergy must be valid in meter telemetry.");
            }
        }
        else {
            throw new ArgumentError("TotalEnergy", "TotalEnergy is required in meter telemetry.");
        }

        if ("TimeStamp" in jsonData && hasData(jsonData.TimeStamp)) {
            if (jsonData.TimeStamp instanceof Date) {
                this.timeStamp = jsonData.TimeStamp;
            }
            else if (typeof jsonData.TimeStamp === "number" || typeof jsonData.TimeStamp === "string") {
                this.timeStamp = new Date(jsonData.TimeStamp);
            }
            else {
                throw new ArgumentError("TimeStamp", "Invalid date type for TimeStamp in meter telemetry.");
            }

            if (isNaN(this.timeStamp.getTime())) {
                throw new ArgumentError("TimeStamp", "TimeStamp must be valid in meter telemetry.");
            }
        }
        else {
            throw new ArgumentError("TimeStamp", "TimeStamp is required in meter telemetry.");
        }

        this.status = false;
        if ("Status" in jsonData && hasData(jsonData.Status)) {
            if (jsonData.Status === true || jsonData.Status === 1) {
                this.status = true;
            }
            else if (!(jsonData.Status === false || jsonData.Status === 0)) {
                throw new ArgumentError("Status", "Status must be valid in meter telemetry.");
            }
        }

        if ("Uptime" in jsonData && hasData(jsonData.Uptime)) {
            if (!(typeof jsonData.Uptime === "number" && jsonData.Uptime > 0)) {
                throw new ArgumentError("Uptime", "Uptime must be valid in meter telemetry.");
            }
            this.uptime = jsonData.Uptime;
        }
        else {
            throw new ArgumentError("Uptime", "Uptime is required in meter telemetry.");
        }
    }
}