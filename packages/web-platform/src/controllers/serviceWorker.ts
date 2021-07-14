/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Web } from "@glue42/web";
import { serviceWorkerBroadcastChannelName } from "../common/constants";
import { InternalPlatformConfig } from "../common/types";
import logger from "../shared/logger";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction,
} from "callback-registry";
import { GlueNotificationData } from "../libs/notifications/types";

export class ServiceWorkerController {
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private _serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
    private channel!: BroadcastChannel;

    private get logger(): Glue42Web.Logger.API | undefined {
        return logger.get("service.worker.web.platform");
    }

    private get serviceWorkerRegistration(): ServiceWorkerRegistration {
        if (!this._serviceWorkerRegistration) {
            throw new Error("Accessing missing service worker registration object. This is caused because the application is trying to raise a persistent notification, which requires a service worker. Please provide a service worker config when initializing GlueWebPlatform.");
        }

        return this._serviceWorkerRegistration;
    }

    public async connect(config: InternalPlatformConfig): Promise<void> {
        if (!config.serviceWorker) {
            return;
        }

        this.logger?.info("Detected service worker definition, connecting...");

        if (!config.serviceWorker.url && !config.serviceWorker.registrationPromise) {
            throw new Error("The service worker config is defined, but it is missing a url or a registration promise, please provide one or the other");
        }

        if (config.serviceWorker.url && config.serviceWorker.registrationPromise) {
            throw new Error("The service worker is over-specified, there is both defined url and a registration promise, please provide one or the other");
        }

        this._serviceWorkerRegistration = config.serviceWorker.url ?
            await this.registerWorker(config.serviceWorker.url) :
            await this.waitRegistration(config.serviceWorker.registrationPromise as Promise<ServiceWorkerRegistration>);

        if (this._serviceWorkerRegistration) {
            this.setUpBroadcastChannelConnection();
        }

        this.logger?.info("Service worker connection completed.");
    }

    public async showNotification(settings: Glue42Web.Notifications.RaiseOptions, id: string): Promise<void> {

        const options: NotificationOptions = Object.assign({}, settings, { title: undefined, clickInterop: undefined, actions: undefined });

        options.actions = settings.actions?.map((action) => {
            return {
                action: action.action,
                title: action.title,
                icon: action.icon
            };
        });

        const glueData: GlueNotificationData = {
            clickInterop: settings.clickInterop,
            actions: settings.actions,
            id
        };

        if (options.data) {
            options.data.glueData = glueData;
        } else {
            options.data = { glueData };
        }

        await this.serviceWorkerRegistration.showNotification(settings.title, options);
    }

    public notifyReady(): void {
        if (this._serviceWorkerRegistration) {
            this.channel.postMessage({ platformStarted: true });
        }
    }

    public onNotificationClick(callback: (clickData: { action: string; glueData: GlueNotificationData; definition: Glue42Web.Notifications.NotificationDefinition }) => void): UnsubscribeFunction {
        return this.registry.add("notification-click", callback);
    }

    private setUpBroadcastChannelConnection(): void {
        this.channel = new BroadcastChannel(serviceWorkerBroadcastChannelName);

        this.channel.addEventListener("message", async (event) => {

            const eventData = event.data;
            const messageType: string = eventData?.messageType;

            if (!messageType) {
                return;
            }

            if (messageType === "ping") {
                this.channel.postMessage({ pong: true });
                return;
            }

            if (messageType === "notificationClick") {
                const action = eventData.action as string;
                const glueData = eventData.glueData;

                const definition: Glue42Web.Notifications.NotificationDefinition = eventData.definition;

                this.registry.execute("notification-click", { action, glueData, definition });
                return;
            }

            if (messageType === "notificationError") {
                this.logger?.error(`Service worker error when raising notification: ${eventData.error}`);
                return;
            }

        });
    }

    private async registerWorker(workerUrl: string): Promise<ServiceWorkerRegistration | undefined> {

        if (!("serviceWorker" in navigator)) {
            this.logger?.warn(`A defined service worker has not been registered at ${workerUrl} because this browser does not support it.`);
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register(workerUrl);

            return registration;
        } catch (error) {
            const stringError = typeof error === "string" ? error : JSON.stringify(error.message);

            this.logger?.warn(stringError);
        }
    }

    private async waitRegistration(registrationPromise: Promise<ServiceWorkerRegistration>): Promise<ServiceWorkerRegistration> {

        if (typeof registrationPromise.then !== "function" || typeof registrationPromise.catch !== "function") {
            throw new Error("The provided service worker registration promise is not a promise");
        }

        const registration = await registrationPromise;

        if (typeof registration.showNotification !== "function") {
            throw new Error("The provided registration promise is a promise, but it resolved with an object which does not appear to be a ServiceWorkerRegistration");
        }

        return registration;
    }
}