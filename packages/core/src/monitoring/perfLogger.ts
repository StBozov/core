import { PerfCollection } from "./collection";
import { PerfDomain, PerfEvent, PerfStatus } from "./event";
import { Logger, LogMessage } from "./logger";

export class PerfLogger implements Logger {
    private nextId = -1;

    constructor(private collection: PerfCollection) {

    }

    public log(msg: LogMessage): void {
        const event = this.createPerfEvent(msg.domain, msg.ipc);
        event.status = msg.status ?? event.status;
        event.metadata = msg.metadata;
        event.size = JSON.stringify(msg.args)?.length ?? 0;
        this.collection.addEvent(event);
    }

    public start(msg: LogMessage) {
        if (msg.metadata?.methodDefinition === "Tick42.Monitoring.GetEvents" ||
            msg.metadata?.methodFilter === "Tick42.Monitoring.GetEvents") {
            return {
                // Do not log monitoring methods
                success: (result: any) => { /*do nothing*/ }, error: (err: Error) => { /*do nothing*/ }
            };
        }

        const event = this.createPerfEvent(msg.domain, msg.ipc);
        const start = window.performance.now();
        event.metadata = JSON.stringify(msg.metadata);
        event.size = JSON.stringify(msg.args)?.length ?? 0;
        this.collection.addEvent(event);
        return {
            success: (result: any) => {
                const end = window.performance.now();
                const copy = { ...event };
                copy.status = PerfStatus.Completed;
                copy.size = (copy.size ?? 0) + (JSON.stringify(result)?.length ?? 0);
                copy.elapsed = end - start;
                this.collection.changeEvent(copy.id, copy);
            },
            error: (err: Error) => {
                const end = window.performance.now();
                const copy = { ...event };
                copy.error = err.message;
                copy.status = PerfStatus.Failed;
                copy.elapsed = end - start;
                this.collection.changeEvent(copy.id, copy);
            }
        };
    }

    private createPerfEvent(domain: PerfDomain, ipc?: boolean): PerfEvent {
        return {
            id: this.getNextId(),
            date: new Date(),
            status: PerfStatus.Pending,
            domain,
            ipc: ipc ?? true
        };
    }

    private getNextId(): number {
        return this.nextId += 1;
    }
}
