import { Glue42Core } from "../../../../glue";
import { Protocol, MetricsSettings } from "../../types";
import { composeMsgForRootStateMetric, getMetricValueByType, normalizeMetricName, serializeMetric } from "./serializer";
import Connection from "../../../connection/connection";
import { LogMessage } from "../../../monitoring/Logger";
import { PerfDomain, PerfStatus } from "../../../monitoring/event";

export default function (connection: Connection, config: MetricsSettings): Protocol {
    if (!connection || typeof connection !== "object") {
        throw new Error("Connection is required parameter");
    }

    let joinPromise: Promise<any>;
    let session: Glue42Core.Connection.GW3DomainSession;

    const init = (repo: Glue42Core.Metrics.Repository): void => {
        let resolveReadyPromise: (() => void) | undefined;
        joinPromise = new Promise((resolve) => {
            resolveReadyPromise = resolve;
            const perfMsg: LogMessage = {
                domain: PerfDomain.Metrics,
                status: PerfStatus.Completed,
                metadata: "metrics joined",
                ipc: true
            };
            config.perfLogger?.log(perfMsg);
        });

        session = connection.domain("metrics");

        session.onJoined((reconnect) => {
            if (!reconnect && resolveReadyPromise) {
                resolveReadyPromise();
                resolveReadyPromise = undefined;
            }

            // Creating root state metric
            const rootStateMetric: any = {
                name: "/State",
                type: "object",
                composite: {
                    Description: {
                        type: "string",
                        description: "",
                    },
                    Value: {
                        type: "number",
                        description: "",
                    },
                },
                description: "System state",
                context: {},
            };

            const defineRootMetricsMsg = {
                type: "define",
                metrics: [rootStateMetric],
            };

            session.send(defineRootMetricsMsg);

            if (reconnect) {
                replayRepo(repo);
            }

        });

        session.join({
            system: config.system,
            service: config.service,
            instance: config.instance
        });
    };

    const replayRepo = (repo: Glue42Core.Metrics.Repository) => {
        replaySystem(repo.root);
    };

    const replaySystem = (system: Glue42Core.Metrics.System) => {
        // replay system
        createSystem(system);

        // replay all metrics in the system
        system.metrics.forEach((m) => {
            createMetric(m);
        });

        // replay all sub-systems
        system.subSystems.forEach((ss) => {
            replaySystem(ss);
        });
    };

    const createSystem = async (system: Glue42Core.Metrics.System): Promise<void> => {
        if (system.parent === undefined) {
            return;
        }

        await joinPromise;
        const metric = {
            name: normalizeMetricName(system.path.join("/") + "/" + system.name + "/State"),
            type: "object",
            composite: {
                Description: {
                    type: "string",
                    description: "",
                },
                Value: {
                    type: "number",
                    description: "",
                },
            },
            description: "System state",
            context: {},
        };

        const createMetricsMsg = {
            type: "define",
            metrics: [metric],
        };

        session.send(createMetricsMsg);
    };

    const updateSystem = async (system: Glue42Core.Metrics.System, state: Glue42Core.Metrics.State): Promise<void> => {
        await joinPromise;

        const shadowedUpdateMetric = {
            type: "publish",
            values: [{
                name: normalizeMetricName(system.path.join("/") + "/" + system.name + "/State"),
                value: {
                    Description: state.description,
                    Value: state.state,
                },
                timestamp: Date.now(),
            }],
        };

        session.send(shadowedUpdateMetric);

        const stateObj = composeMsgForRootStateMetric(system);
        const rootMetric = {
            type: "publish",
            peer_id: connection.peerId,
            values: [{
                name: "/State",
                value: {
                    Description: stateObj.description,
                    Value: stateObj.value,
                },
                timestamp: Date.now(),
            }],
        };

        session.send(rootMetric);
    };

    const createMetric = async (metric: Glue42Core.Metrics.Metric): Promise<void> => {
        const metricClone = cloneMetric(metric);
        await joinPromise;
        const m = serializeMetric(metricClone);

        const createMetricsMsg = {
            type: "define",
            metrics: [m],
        };

        session.send(createMetricsMsg);
        if (typeof metricClone.value !== "undefined") {
            // do not use updateMetric because it will dispatch the call (joinPromise.then)
            // which leads to method calls reorder. It is safe to call updateMetricCore directly
            // because we are being executed in joinPromise.then
            updateMetricCore(metricClone);
        }
    };

    const updateMetric = async (metric: Glue42Core.Metrics.Metric): Promise<void> => {
        const metricClone = cloneMetric(metric);
        await joinPromise;
        updateMetricCore(metricClone);
    };

    const updateMetricCore = async (metric: Glue42Core.Metrics.Metric): Promise<void> => {
        if (canUpdate()) {
            const value = getMetricValueByType(metric);
            const publishMetricsMsg = {
                type: "publish",
                values: [{
                    name: normalizeMetricName(metric.path.join("/") + "/" + metric.name),
                    value,
                    timestamp: Date.now(),
                }],
            };
            await session.sendFireAndForget(publishMetricsMsg);
            const perfMsg: LogMessage = {
                domain: PerfDomain.Metrics,
                status: PerfStatus.Completed,
                metadata: "updateMetric method",
                ipc: true,
                args: publishMetricsMsg
            };
            config.perfLogger?.log(perfMsg);
            return;
        }
        return Promise.resolve();
    };

    const cloneMetric = (metric: Glue42Core.Metrics.Metric): Glue42Core.Metrics.Metric => {
        const metricClone: Glue42Core.Metrics.Metric = { ...metric };
        if (typeof metric.value === "object" && metric.value !== null) {
            metricClone.value = { ...metric.value };
        }
        return metricClone;
    };

    const canUpdate = (): boolean => {
        try {
            const func = config.canUpdateMetric ?? (() => true);
            return func();
        } catch {
            return true;
        }
    };

    return {
        init,
        createSystem,
        updateSystem,
        createMetric,
        updateMetric,
    };
}
