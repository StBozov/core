import { PerfCollection } from "./collection";
import { PerfEvent } from "./event";

export class UnboundedPerfCollection implements PerfCollection {

    public get capacity(): number {
        // calculate memory not length
        throw new Error("Method not implemented.");
    }

    public droppedMessages = 0;
    private _collection: { [id: string]: PerfEvent; } = {};

    constructor(collection?: PerfCollection) {
        collection?.getEvents().forEach((e) => this._collection[e.id] = e);
    }

    public changeCapacity(size: number): void {
        throw new Error("Method not implemented.");
    }

    public getEvent(id: number): PerfEvent {
        throw new Error("Method not implemented.");
    }

    // ------------- Implement -------------------------
    public getEvents(): PerfEvent[] {
        const arr: PerfEvent[] = [];
        Object.values(this._collection).forEach((kvp) => arr.push(kvp));
        return arr;
    }
    public addEvent(e: PerfEvent): void {
        this._collection[e.id] = e;
    }
    public changeEvent(id: number, newEvent: PerfEvent): boolean {
        this._collection[id] = newEvent;
        return true;
    }
    // -------------------------------------------------
    public removeEvent(e: PerfEvent): boolean {
        delete this._collection[e.id];
        return true;
    }
    public onEvent(callback: (action: "added" | "changed" | "removed", e: PerfEvent) => void): void {
        throw new Error("Method not implemented.");
    }
}
