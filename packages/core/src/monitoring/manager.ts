import Interop from "../interop/interop";
import { PerfClient } from "./client";
import { PerfCollection } from "./collection";
import { DefaultPerfClient } from "./defaultClient";
import { Logger } from "./logger";
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

    public getAll(): Promise<any> {
        return this.interop().invoke("Tick42.Monitoring.GetEvents", {}, "all");
    }

    public get version(): string {
        throw new Error("Method not implemented.");
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
