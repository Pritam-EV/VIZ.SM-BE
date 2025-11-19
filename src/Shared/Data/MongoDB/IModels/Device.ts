import type { DeviceStatus } from "../../../Common/Enums/Device.js";
import type { IAddress as IDeviceAddress, IAddressLine1 as IDeviceAddressLine1, IAddressLine2 as IDeviceAddressLine2 } from "./Address.js";
// import type { IPartnerLink } from "./Member.js";
// import type { IModelTimeStamps } from "./ModelBase.js";

export type { IDeviceAddress, IDeviceAddressLine1, IDeviceAddressLine2 };

export interface IElectricTelemetry {
    voltage: number;
    current: number;
    power: number;
    timeStamp: Date;
}

interface IElectricState {
    totalEnergy: number;
}

export interface IDevice extends IElectricState /*, IModelTimeStamps, IPartnerLink */ {
    _id: string;
    consumerId: string;
    address: IDeviceAddress;
    status: DeviceStatus;
    rate: number;
    pool: number;
    telemetry?: IElectricTelemetry;
    reason?: string;
}

interface IMeterState {
    status: boolean;
    uptime: number;
}

export interface IMeterTelemetry extends IElectricTelemetry, IElectricState, IMeterState {
    _id: string;
    deviceId: string;
}