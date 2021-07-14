/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42 } from "@glue42/desktop";
import { Decoder } from "decoder-validate";
import { Glue42Web } from "../../web";
import { IoC } from "./ioc";

export interface ParsedConfig extends Glue42Web.Config {
    logger: any;
    libraries: Array<(glue: Glue42Web.API, config?: Glue42Web.Config | Glue42.Config) => Promise<void>>;
}

export interface LibController {
    start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void>;
    handleBridgeMessage(args: any): Promise<void>;
}

export type LibDomains = "system" | "windows" | "appManager" | "layouts" | "notifications" | "intents" | "channels";

export interface BridgeOperation {
    name: string;
    dataDecoder?: Decoder<any>;
    resultDecoder?: Decoder<any>;
    execute?: (args: any) => Promise<any>;
}
