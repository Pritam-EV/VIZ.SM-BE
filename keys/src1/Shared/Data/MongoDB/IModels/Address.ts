export interface IAddressLine1 {
    room: string;
    floor: string;
    building: string;
    society?: string;
}

export interface IAddressLine2 {
    lane?: string;
    area?: string;
    road?: string;
    landmark?: string;
}

export interface IAddress {
    line1: IAddressLine1;
    line2: IAddressLine2;
    city: string; // village / town / city
    subdivision: string;
    district: string;
    state: string;
    postalCode: number;
    /**
     * Unit: Degree (°) [-90° to 90°]  
     * Minimum: -90  
     * Maximum: 90  
     */
    latitude: number;
    /**
     * Unit: Degree (°) [-180° to 180°]  
     * Minimum: -180  
     * Maximum: 180  
     */
    longitude: number;
}