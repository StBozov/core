/* eslint-disable @typescript-eslint/no-explicit-any */
import { setupCore, openCorePlatform, raiseGlueNotification } from "./worker";

if (typeof self !== "undefined") {
    (self as any).GlueWebWorker = setupCore;
    (self as any).openCorePlatform = openCorePlatform;
    (self as any).raiseGlueNotification = raiseGlueNotification;
}

export { openCorePlatform, raiseGlueNotification } from "./worker";

export default setupCore;
