import type { AnyDataType } from "../Types/UnionTypes.js";

/**
 * The oldest element is automatically removed once queue is full
 */
export default class FixedSizeQueue<T extends NonNullable<AnyDataType>> {
    #queue: T[];
    #capacity: number;
    #tail: number;

    public constructor(capacity: number) {
        if (typeof capacity !== "number" || capacity <= 0 || (capacity - Math.floor(capacity)) > 0) {
            throw new TypeError("capacity must be a positive integer number.");
        }
        this.#capacity = capacity;
        this.#queue = [];
        this.#tail = 0;
    }

    public enqueue(element: T): void {
        this.#queue[this.#tail++ % this.#capacity] = element;
    }

    public includes(element: T): boolean {
        return this.#queue.length > 0 && this.#queue.includes(element);
    }
}