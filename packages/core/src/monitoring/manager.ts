import Interop from "../interop/interop";
import { PerfClient } from "./client";
import { PerfCollection } from "./collection";
import { DefaultPerfClient } from "./defaultClient";
import { PerfEvent } from "./event";
import { Logger, LogMessage } from "./logger";
import { PerfLogger } from "./perfLogger";
import { UnboundedPerfCollection } from "./unbounded";

export class PerfManager {
    private _logger: PerfLogger;
    private _collection: PerfCollection;
    private _clients: PerfClient[] = [];

    constructor(public interop: () => Interop) {
        this._collection = new UnboundedPerfCollection();
        this._logger = new PerfLogger(this._collection);
        this.createDefaultClient();
    }

    public async getAll(): Promise<any> {
        const ir = await this.interop().invoke("Tick42.Monitoring.GetEvents", {}, "all");
        const results: any[] = [];
        ir.all_return_values?.forEach((item) => {
            const instance = item.executed_by?.instance;
            const application = item.executed_by?.applicationName ?? item.executed_by?.application;
            (item.returned.events as [])?.forEach((i) => {
                results.push(Object.assign({}, i, { instance, application }));
            });
        });
        return results;
    }

    public get version(): string {
        throw new Error("Method not implemented.");
    }

    public static get nullLogger(): Logger {
        return {
            log: (msg: LogMessage) => { /*do nothing*/ },
            start: (msg: LogMessage) => {
                return { success: (result: any) => { /*do nothing*/ }, error: (err: Error) => { /*do nothing*/ } };
            }
        };
    }

    public get logger(): Logger {
        return this._logger;
    }

    public get clients(): PerfClient[] {
        return this._clients;
    }

    public get defaultClient(): PerfClient {
        return this.clients[0];
    }

    public createMonitoringClient(): PerfClient {
        throw new Error("Method not implemented.");
    }

    public createDevToolsClient(): PerfClient {
        throw new Error("Method not implemented.");
    }

    public removeClient(client: PerfClient): boolean {
        throw new Error("Method not implemented.");
    }

    private createDefaultClient(): PerfClient {
        const client = new DefaultPerfClient(this._collection);
        this._clients.push(client);
        return client;
    }
}
