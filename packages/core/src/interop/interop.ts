import Client from "./client/client";
import Server from "./server/server";
import { Protocol, SubscribeError, InteropSettings } from "./types";
import { Glue42Core } from "../../glue";
import ClientRepository from "./client/repository";
import ServerRepository from "./server/repository";
import { UnsubscribeFunction } from "callback-registry";
import gW3ProtocolFactory from "./protocols/gw3/factory";
import { InstanceWrapper } from "./instance";
import { Logger as PerfLogger, LogMessage } from "../monitoring/logger";
import { PerfDomain } from "../monitoring/event";
import { PromiseWrapper } from "../utils/pw";

export default class Interop implements Glue42Core.AGM.API {
    public instance: Glue42Core.AGM.Instance;
    public readyPromise: Promise<Interop>;

    public client!: Client;
    public server!: Server;
    public unwrappedInstance: InstanceWrapper;
    private protocol!: Protocol;
    private clientRepository: ClientRepository;
    private serverRepository: ServerRepository;
    private perfLogger: PerfLogger;

    constructor(configuration: InteropSettings) {
        if (typeof configuration === "undefined") {
            throw new Error("configuration is required");
        }

        if (typeof configuration.connection === "undefined") {
            throw new Error("configuration.connections is required");
        }

        const connection = configuration.connection;

        if (typeof configuration.methodResponseTimeout !== "number") {
            configuration.methodResponseTimeout = 30 * 1000;
        }
        if (typeof configuration.waitTimeoutMs !== "number") {
            configuration.waitTimeoutMs = 30 * 1000;
        }

        // Initialize our modules
        this.perfLogger = configuration.perfLogger;
        this.unwrappedInstance = new InstanceWrapper(this, undefined, connection);
        this.instance = this.unwrappedInstance.unwrap();
        this.clientRepository = new ClientRepository(configuration.logger.subLogger("cRep"), this);
        this.serverRepository = new ServerRepository();
        let protocolPromise: Promise<Protocol>;

        if (connection.protocolVersion === 3) {
            protocolPromise = gW3ProtocolFactory(this.instance, connection, this.clientRepository, this.serverRepository, configuration, this);
        } else {
            throw new Error(`protocol ${connection.protocolVersion} not supported`);
        }

        // wait for protocol to resolve
        this.readyPromise = protocolPromise.then((protocol: Protocol) => {
            this.protocol = protocol;
            this.client = new Client(this.protocol, this.clientRepository, this.instance, configuration);
            this.server = new Server(this.protocol, this.serverRepository);
            return this;
        });

        const metadata = {
            methodName: "interop constructor",
            configuration: { waitTimeoutMs: configuration.waitTimeoutMs, methodResponseTimeout: configuration.methodResponseTimeout }
        };
        const end = this.perfLogger.start({ domain: PerfDomain.Interop, metadata, ipc: true });

        this.readyPromise.then(() => end.success()).catch((err) => end.error(err));
    }

    public ready() {
        return this.readyPromise;
    }

    public serverRemoved(callback: (instance: Glue42Core.AGM.Instance, reason: string) => void): UnsubscribeFunction {
        return this.client.serverRemoved(callback);
    }

    public serverAdded(callback: (instance: Glue42Core.AGM.Instance) => void): UnsubscribeFunction {
        return this.client.serverAdded(callback);
    }

    public serverMethodRemoved(callback: (info: { server: Glue42Core.AGM.Instance; method: Glue42Core.AGM.Method; }) => void): UnsubscribeFunction {
        return this.client.serverMethodRemoved(callback);
    }

    public serverMethodAdded(callback: (info: { server: Glue42Core.AGM.Instance; method: Glue42Core.AGM.Method; }) => void): UnsubscribeFunction {
        return this.client.serverMethodAdded(callback);
    }

    public methodRemoved(callback: (def: Glue42Core.AGM.Method) => void): UnsubscribeFunction {
        return this.client.methodRemoved(callback);
    }

    public methodAdded(callback: (def: Glue42Core.AGM.Method) => void): UnsubscribeFunction {
        return this.client.methodAdded(callback);
    }

    public methodsForInstance(instance: Glue42Core.AGM.Instance): Glue42Core.Interop.Method[] {
        return this.client.methodsForInstance(instance);
    }

    public methods(methodFilter: Glue42Core.AGM.MethodDefinition): Glue42Core.Interop.Method[] {
        return this.client.methods(methodFilter);
    }

    public servers(methodFilter: Glue42Core.AGM.MethodDefinition): Glue42Core.AGM.Instance[] {
        return this.client.servers(methodFilter);
    }

    public subscribe(method: string, options: Glue42Core.AGM.SubscriptionParams, successCallback?: (subscription: Glue42Core.AGM.Subscription) => void, errorCallback?: (err: SubscribeError) => void): Promise<Glue42Core.AGM.Subscription> {
        const metadata = { methodName: "subscribe", method, options };
        const end = this.perfLogger.start({ domain: PerfDomain.Interop, metadata, ipc: true });

        const result = this.client.subscribe(method, options, successCallback, errorCallback);
        // TODO: log push to the stream as well

        result.then(() => end.success()).catch(end.error);
        return result;
    }

    public async createStream(streamDef: string | Glue42Core.AGM.MethodDefinition, callbacks: Glue42Core.AGM.StreamOptions, successCallback?: (args?: object) => void, errorCallback?: (error?: string | object) => void): Promise<Glue42Core.AGM.Stream> {
        const metadata = { methodName: "createStream", streamDef };
        const end = this.perfLogger.start({ domain: PerfDomain.Interop, metadata, ipc: true });

        let result: Glue42Core.AGM.Stream;
        try {
            result = await this.server.createStream(streamDef, callbacks, successCallback, errorCallback);
            end.success();
        } catch (err) {
            end.error(err);
            throw err;
        }
        return Object.assign({}, result, {
            push: (data: object, branches?: string | string[]) => {
                const event: LogMessage = { domain: PerfDomain.Interop, metadata: { methodName: "push", streamDef }, ipc: true, args: data };
                try {
                    result.push(data, branches);
                    this.perfLogger.log(event);
                } catch (err) {
                    event.error = err;
                    this.perfLogger.log(event);
                    throw err;
                }
            },
            close: () => {
                const event: LogMessage = { domain: PerfDomain.Interop, metadata: { methodName: "close", streamDef }, ipc: true };
                try {
                    result.close();
                    this.perfLogger.log(event);
                } catch (err) {
                    event.error = err;
                    this.perfLogger.log(event);
                    throw err;
                }
            }
        });
    }

    public unregister(methodFilter: string | Glue42Core.AGM.MethodDefinition): Promise<void> {
        const metadata = { methodName: "unregister", methodFilter };
        const end = this.perfLogger.start({ domain: PerfDomain.Interop, metadata, ipc: true });

        const result = this.server.unregister(methodFilter);

        result.then(end.success).catch(end.error);
        return result;
    }

    public registerAsync(methodDefinition: string | Glue42Core.AGM.MethodDefinition, callback: (args: any, caller: Glue42Core.AGM.Instance, successCallback: (args?: any) => void, errorCallback: (error?: string | object) => void) => void): Promise<void> {
        const metadata = { methodName: "registerAsync", methodDefinition };
        const end = this.perfLogger.start({ domain: PerfDomain.Interop, metadata, ipc: true });

        const result = this.server.registerAsync(methodDefinition, callback);

        result.then(end.success).catch(end.error);
        return result;
    }

    public register(methodDefinition: string | Glue42Core.AGM.MethodDefinition, callback: (args: any, caller: Glue42Core.AGM.Instance) => any | Promise<void>): Promise<void> {
        const metadata = { methodName: "register", methodDefinition };
        const end = this.perfLogger.start({ domain: PerfDomain.Interop, metadata, ipc: true });

        const result = this.server.register(methodDefinition, callback);

        result.then(end.success).catch(end.error);
        return result;
    }

    public invoke(methodFilter: string | Glue42Core.AGM.MethodDefinition, argumentObj?: object, target?: Glue42Core.AGM.InstanceTarget | Glue42Core.AGM.Instance | Glue42Core.AGM.Instance[], additionalOptions?: Glue42Core.AGM.InvokeOptions, success?: (result: Glue42Core.AGM.InvocationResult<any>) => void, error?: (error: { method: Glue42Core.AGM.MethodDefinition; called_with: object; executed_by: Glue42Core.AGM.Instance; message: string; status: number; returned: object; }) => void): Promise<Glue42Core.AGM.InvocationResult<any>> {
        const metadata = { methodName: "invoke", methodFilter, target, additionalOptions };
        const end = this.perfLogger.start({ domain: PerfDomain.Interop, metadata, ipc: true, args: argumentObj });

        const result = this.client.invoke(methodFilter, argumentObj, target, additionalOptions, success, error);

        result.then((obj) => end.success(obj)).catch(end.error);
        return result;
    }

    public waitForMethod(name: string): Promise<Glue42Core.Interop.Method> {
        const pw = new PromiseWrapper<Glue42Core.Interop.Method>();
        const unsubscribe = this.client.methodAdded((m) => {
            if (m.name === name) {
                unsubscribe();
                pw.resolve(m);
            }
        });

        return pw.promise;
    }
}
