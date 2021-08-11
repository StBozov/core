import { PerfCollection } from "./collection";
import { PerfEvent, PerfStatus } from "./event";
import { Logger, LogMessage } from "./logger";

export class PerfLogger implements Logger {
    private nextId = -1;

    constructor(private collection: PerfCollection) {

    }

    public log(msg: LogMessage): void {
        const event = this.createPerfEvent(msg);
        if (!this.canLog(event)) {
            return;
        }
        event.error = msg.error?.message;
        event.status = event.error ? PerfStatus.Failed : PerfStatus.Completed;
        this.collection.addEvent(event);
    }

    public start(msg: LogMessage) {
        const event = this.createPerfEvent(msg);
        if (msg.metadata?.methodDefinition === "Tick42.Monitoring.GetEvents" ||
            msg.metadata?.methodFilter === "Tick42.Monitoring.GetEvents" ||
            !this.canLog(event)) {
            return {
                // Do not log monitoring methods
                success: (result: any) => { /*do nothing*/ }, error: (err: Error) => { /*do nothing*/ }
            };
        }

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
                if (this.canLog(copy)) {
                    this.collection.changeEvent(copy.id, copy);
                } else {
                    this.collection.removeEvent(copy);
                }
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
            params: JSON.stringify(msg.args),
            paramsSize: JSON.stringify(msg.args)?.length ?? 0
        };
    }

    private getNextId(): number {
        return this.nextId += 1;
    }

    private canLog(event: PerfEvent): boolean {
        const skipParams = !event.params ? false : JSON.stringify(event.params)?.indexOf("skipPerfLogging") !== -1;
        const skipResult = !event.result ? false : JSON.stringify(event.result)?.indexOf("skipPerfLogging") !== -1;
        return !skipParams && !skipResult;
    }
}
