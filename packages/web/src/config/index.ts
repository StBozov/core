import { Glue42Web } from "../../web";
import { ParsedConfig } from "../shared/types";

const defaultConfig = {
    logger: "info",
    gateway: { webPlatform: {} },
    libraries: []
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const parseConfig = (config?: Glue42Web.Config): ParsedConfig => {
    const combined = Object.assign({}, defaultConfig, config);

    if (combined.systemLogger) {
        combined.logger = combined.systemLogger.level ?? "info";
    }

    return combined;
};
