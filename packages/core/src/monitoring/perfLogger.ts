import { PerfCollection } from "./collection";
import { PerfDomain, PerfEvent, PerfStatus } from "./event";
import { Logger, LogMessage } from "./logger";

export class PerfLogger implements Logger {
    private nextId = -1;

    constructor(private collection: PerfCollection) {

    }

    public log(msg: LogMessage): void {
        const event = this.createPerfEvent(msg);
        event.error = msg.error?.message;
        event.status = event.error ? PerfStatus.Failed : PerfStatus.Completed;
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

        const event = this.createPerfEvent(msg);
        const start = window.performance.now();
        this.collection.addEvent(event);
        return {
            success: (result: any) => {
                const end = window.performance.now();
                const copy = { ...event };
                copy.status = PerfStatus.Completed;
                copy.result = result;
                copy.resultSize = JSON.stringify(result)?.length ?? 0;
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

    private createPerfEvent(msg: LogMessage): PerfEvent {
        return {
            id: this.getNextId(),
            date: new Date(),
            status: PerfStatus.Pending,
            domain: msg.domain,
            ipc: msg.ipc ?? true,
            metadata: JSON.stringify(msg.metadata),
            params: msg.args,
            paramsSize: JSON.stringify(msg.args)?.length ?? 0
        };
    }

    private getNextId(): number {
        return this.nextId += 1;
    }
}
