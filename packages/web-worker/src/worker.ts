/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42WebWorkerFactoryFunction, WebWorkerConfig } from "../web.worker";
import { platformOpenTimeoutMS, platformPingTimeoutMS, serviceWorkerBroadcastChannelName } from "./constants";
import { webWorkerConfigDecoder } from "./decoders";
import { generate } from "shortid";

const checkPlatformOpen = (): Promise<boolean> => {
    const checkPromise = new Promise<boolean>((resolve) => {
        const channel = new BroadcastChannel(serviceWorkerBroadcastChannelName);

        const existenceHandler = function (event: any): void {
            const data = event.data;

            if (data.pong) {
                channel.removeEventListener("message", existenceHandler);
                resolve(true);
            }
        };

        channel.addEventListener("message", existenceHandler);

        channel.postMessage({ messageType: "ping" });
    });

    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), platformPingTimeoutMS));

    return Promise.race([checkPromise, timeoutPromise]);
};

const validateConfig = (config: WebWorkerConfig = {}): WebWorkerConfig => {
    const validated = webWorkerConfigDecoder.runWithException(config);

    return validated;
};

export const raiseGlueNotification = async (settings: any): Promise<void> => {

    const options = Object.assign({}, settings, { title: undefined, clickInterop: undefined, actions: undefined });

    options.actions = settings.actions?.map((action: any) => {
        return {
            action: action.action,
            title: action.title,
            icon: action.icon
        };
    });

    const glueData = {
        clickInterop: settings.clickInterop,
        actions: settings.actions,
        id: generate()
    };

    if (options.data) {
        options.data.glueData = glueData;
    } else {
        options.data = { glueData };
    }

    return (self as any).registration.showNotification(settings.title, options);
};

export const openCorePlatform = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {

        if (!url) {
            return reject("Cannot open the platform, because a url was not provided");
        }

        const channel = new BroadcastChannel(serviceWorkerBroadcastChannelName);

        const openHandler = function (event: any): void {
            const data = event.data;

            if (data.platformStarted) {
                channel.removeEventListener("message", openHandler);
                resolve();
            }
        };

        channel.addEventListener("message", openHandler);

        (self as any).clients.openWindow(url).catch(reject);

        setTimeout(() => reject(`Timed out waiting for the platform to open and send a ready signal: ${platformOpenTimeoutMS} MS`), platformOpenTimeoutMS);
    });
};

export const setupCore: Glue42WebWorkerFactoryFunction = (config?: WebWorkerConfig): void => {
    const verifiedConfig = validateConfig(config);

    self.addEventListener("notificationclick", (event: any) => {
        let isPlatformOpen: boolean;

        const channel = new BroadcastChannel(serviceWorkerBroadcastChannelName);

        const executionPromise = checkPlatformOpen()
            .then((platformExists: boolean) => {

                isPlatformOpen = platformExists;

                const action = event.action;

                if (!action && verifiedConfig.notifications?.defaultClick) {
                    return verifiedConfig.notifications.defaultClick(event, isPlatformOpen);
                }

                if (action && verifiedConfig.notifications?.actionClicks?.some((actionDef) => actionDef.action === action)) {
                    const foundHandler = verifiedConfig.notifications.actionClicks.find((actionDef) => actionDef.action === action).handler;

                    return foundHandler(event, isPlatformOpen);
                }
            })
            .then(() => {
                if (!isPlatformOpen && verifiedConfig.platform?.openIfMissing) {
                    return openCorePlatform(verifiedConfig.platform.url);
                }
            })
            .then(() => {

                const messageType = "notificationClick";

                const action = (event as any).action;
                const glueData = (event as any).notification.data.glueData;

                const definition = {
                    badge: (event as any).notification.badge,
                    body: (event as any).notification.body,
                    data: (event as any).notification.data,
                    dir: (event as any).notification.dir,
                    icon: (event as any).notification.icon,
                    image: (event as any).notification.image,
                    lang: (event as any).notification.lang,
                    renotify: (event as any).notification.renotify,
                    requireInteraction: (event as any).notification.requireInteraction,
                    silent: (event as any).notification.silent,
                    tag: (event as any).notification.tag,
                    timestamp: (event as any).notification.timestamp,
                    vibrate: (event as any).notification.vibrate
                };

                channel.postMessage({ messageType, action, glueData, definition });
            })
            .catch((error) => {
                const stringError = typeof error === "string" ? error : JSON.stringify(error.message);
                channel.postMessage({ messageType: "notificationError", error: stringError });
            });

        event.waitUntil(executionPromise);
    });
};
