/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "../../web";
import { GlueBridge } from "../communication/bridge";
import { glue42NotificationOptionsDecoder, notificationsOperationTypesDecoder } from "../shared/decoders";
import { IoC } from "../shared/ioc";
import { LibController } from "../shared/types";
import { NotificationEventPayload, operations, PermissionRequestResult, RaiseNotification } from "./protocol";
import { generate } from "shortid";

export class NotificationsController implements LibController {
    private logger!: Glue42Web.Logger.API;
    private bridge!: GlueBridge;
    private notificationsSettings?: Glue42Web.Notifications.Settings;
    private notifications: { [key in string]: Glue42Web.Notifications.Notification } = {};
    private coreGlue!: Glue42Core.GlueCore;
    private buildNotificationFunc!: (config: Glue42Web.Notifications.RaiseOptions) => Glue42Web.Notifications.Notification;

    public async start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void> {
        this.logger = coreGlue.logger.subLogger("notifications.controller.web");

        this.logger.trace("starting the web notifications controller");

        this.bridge = ioc.bridge;

        this.coreGlue = coreGlue;

        this.notificationsSettings = ioc.config.notifications;

        this.buildNotificationFunc = ioc.buildNotification;

        const api = this.toApi();

        this.addOperationExecutors();

        (coreGlue as Glue42Web.API).notifications = api;

        this.logger.trace("notifications are ready");
    }

    public async handleBridgeMessage(args: any): Promise<void> {
        const operationName = notificationsOperationTypesDecoder.runWithException(args.operation);

        const operation = operations[operationName];

        if (!operation.execute) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let operationData: any = args.data;

        if (operation.dataDecoder) {
            operationData = operation.dataDecoder.runWithException(args.data);
        }

        return await operation.execute(operationData);
    }

    private toApi(): Glue42Web.Notifications.API {
        const api: Glue42Web.Notifications.API = {
            raise: this.raise.bind(this),
            requestPermission: this.requestPermission.bind(this)
        };

        return Object.freeze(api);
    }

    private async requestPermission(): Promise<boolean> {

        const permissionResult = await this.bridge.send<void, PermissionRequestResult>("notifications", operations.requestPermission, undefined);

        return permissionResult.permissionGranted;
    }

    private async raise(options: Glue42Web.Notifications.RaiseOptions): Promise<Glue42Web.Notifications.Notification> {
        const settings = glue42NotificationOptionsDecoder.runWithException(options);

        const permissionGranted = await this.requestPermission();

        if (!permissionGranted) {
            throw new Error("Cannot raise the notification, because the user has declined the permission request");
        }

        const id = generate();

        await this.bridge.send<RaiseNotification, void>("notifications", operations.raiseNotification, { settings, id });

        const notification = this.buildNotificationFunc(options);

        this.notifications[id] = notification;

        return notification;
    }

    private addOperationExecutors(): void {
        operations.notificationShow.execute = this.handleNotificationShow.bind(this);
        operations.notificationClick.execute = this.handleNotificationClick.bind(this);
    }

    private async handleNotificationShow(data: NotificationEventPayload): Promise<void> {

        if (!data.id) {
            return;
        }

        const notification = this.notifications[data.id];
        if (notification && notification.onshow) {
            notification.onshow();
        }
    }

    private async handleNotificationClick(data: NotificationEventPayload): Promise<void> {

        if (!data.action && this.notificationsSettings?.defaultClick) {
            this.notificationsSettings.defaultClick(this.coreGlue as Glue42Web.API, data.definition);
        }

        if (data.action && this.notificationsSettings?.actionClicks?.some((actionDef) => actionDef.action === data.action)) {
            const foundHandler = this.notificationsSettings?.actionClicks?.find((actionDef) => actionDef.action === data.action) as Glue42Web.Notifications.ActionClickHandler;

            foundHandler.handler(this.coreGlue as Glue42Web.API, data.definition);
        }

        if (!data.id) {
            return;
        }

        const notification = this.notifications[data.id];

        if (notification && notification.onclick) {
            notification.onclick();
            delete this.notifications[data.id];
        }

    }
}
