export interface PerfEvent {
    id: number;
    date: Date;
    status: PerfStatus;
    domain: PerfDomain;
    ipc: boolean;
    metadata?: string;
    error?: string;
    params?: any;
    paramsSize?: number;
    result?: any;
    resultSize?: number;
    elapsed?: number;
}

export enum PerfStatus {
    Pending = "pending",
    Completed = "completed",
    Failed = "failed"
}
export enum PerfDomain {
    WS = "ws",
    Interop = "interop",
    Metrics = "metrics",
    Contexts = "contexts"
}
