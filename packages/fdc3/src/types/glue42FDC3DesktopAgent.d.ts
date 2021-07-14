import { DesktopAgent } from "@finos/fdc3";

export type Glue42FDC3DesktopAgent = DesktopAgent & {
    version: string;
    fdc3Ready: (waitForMs: number) => Promise<void>;
};
