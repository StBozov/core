import { PerfDomain, PerfStatus } from "./event";

export interface Logger {
    log(msg: LogMessage): void;
    start(msg: LogMessage): { success: (result?: any) => void, error: (err: Error) => void };
}

export interface LogMessage {
    domain: PerfDomain;
    status?: PerfStatus;
    metadata: any;
    error?: Error;
    ipc?: boolean;
    args?: any;
}
