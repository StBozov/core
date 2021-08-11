import { Glue42Core } from "../../glue";
import { PerfManager } from "./manager";

export class PerfAgmFacade {
    constructor(private perfManager: PerfManager) {
    }

    public registerMethods(interop: Glue42Core.AGM.API): void {
        interop.registerAsync("Tick42.Monitoring.GetEvents", async (args, caller, success, error) => {
            const result = { events: await this.perfManager.defaultClient.getEvents(), skipPerfLogging: true };
            success(result);
        });
    }
}
