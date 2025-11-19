export default class DateConstants {
    static readonly #MinValue: Date = new Date("0001-01-01T00:00:00.000Z");
    static readonly #MaxValue: Date = new Date("9999-12-31T23:59:59.999Z");

    public static get MinValue(): Date {
        return this.#MinValue;
    }

    public static get MaxValue(): Date {
        return this.#MaxValue;
    }
}