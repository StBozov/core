import { PerfEvent } from "./event";

export interface PerfCollection {
    capacity: number;
    droppedMessages: number;
    changeCapacity(size: number): void;

    getEvent(id: number): PerfEvent;
    getEvents(): PerfEvent[];

    addEvent(e: PerfEvent): void;
    changeEvent(id: number, newEvent: PerfEvent): boolean;
    removeEvent(e: PerfEvent): boolean;

    onEvent(callback: (action: "added" | "changed" | "removed", e: PerfEvent) => void): void;
}
