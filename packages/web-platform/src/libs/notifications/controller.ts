/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Web } from "@glue42/web";
import { BridgeOperation, LibController } from "../../common/types";
import { GlueController } from "../../controllers/glue";
import { ServiceWorkerController } from "../../controllers/serviceWorker";
import logger from "../../shared/logger";
import { notificationsOperationDecoder, permissionRequestResultDecoder, raiseNotificationDecoder } from "./decoders";
import { GlueNotificationData, NotificationEventPayload, NotificationsOperationsTypes, PermissionRequestResult, RaiseNotificationConfig } from "./types";

export class NotificationsController implements LibController {

    private started = false;

    private operations: { [key in NotificationsOperationsTypes]: BridgeOperation } = {
        raiseNotification: { name: "raiseNotification", execute: this.handleRaiseNotification.bind(this), dataDecoder: raiseNotificationDecoder },
        requestPermission: { name: "requestPermission", resultDecoder: permissionRequestResultDecoder, execute: this.handleRequestPermission.bind(this) }
    }

    constructor(
        private readonly glueController: GlueController,
        private readonly serviceWorkerController: ServiceWorkerController
    ) { }

    private get logger(): Glue42Web.Logger.API | undefined {
        return logger.get("notifications.controller");
    }

    public async start(): Promise<void> {

        this.started = true;

        this.serviceWorkerController.onNotificationClick(this.handleNotificationClick.bind(this));
    }

    private handleNotificationClick(clickData: { action: string; glueData: GlueNotificationData; definition: Glue42Web.Notifications.NotificationDefinition }): void {
        if (!clickData.action && clickData.glueData?.clickInterop) {
            this.callDefinedInterop(clickData.glueData?.clickInterop);
        }

        if (clickData.action && clickData.glueData?.actions?.some((actionDef) => actionDef.action === clickData.action)) {
            // this is a safe cast, because of the checks above
            const notificationInteropAction = clickData.glueData?.actions?.find((action) => action.action === clickData.action) as Glue42Web.Notifications.NotificationAction;

            if (notificationInteropAction.interop) {
                this.callDefinedInterop(notificationInteropAction.interop);
            }
        }

        if (clickData.definition.data?.glueData) {
            delete clickData.definition.data.glueData;
        }

        const notificationEventPayload: NotificationEventPayload = {
            definition: clickData.definition,
            action: clickData.action,
            id: clickData.glueData?.id
        };

        this.glueController.pushSystemMessage("notifications", "notificationClick", notificationEventPayload);
    }

    public async handleControl(args: any): Promise<any> {
        if (!this.started) {
            new Error("Cannot handle this notifications control message, because the controller has not been started");
        }

        const notificationsData = args.data;

        const commandId = args.commandId;

        const operationValidation = notificationsOperationDecoder.run(args.operation);

        if (!operationValidation.ok) {
            throw new Error(`This notifications request cannot be completed, because the operation name did not pass validation: ${JSON.stringify(operationValidation.error)}`);
        }

        const operationName: NotificationsOperationsTypes = operationValidation.result;

        const incomingValidation = this.operations[operationName].dataDecoder?.run(notificationsData);

        if (incomingValidation && !incomingValidation.ok) {
            throw new Error(`Notifications request for ${operationName} rejected, because the provided arguments did not pass the validation: ${JSON.stringify(incomingValidation.error)}`);
        }

        this.logger?.debug(`[${commandId}] ${operationName} command is valid with data: ${JSON.stringify(notificationsData)}`);

        const result = await this.operations[operationName].execute(notificationsData, commandId);

        const resultValidation = this.operations[operationName].resultDecoder?.run(result);

        if (resultValidation && !resultValidation.ok) {
            throw new Error(`Notifications request for ${operationName} could not be completed, because the operation result did not pass the validation: ${JSON.stringify(resultValidation.error)}`);
        }

        this.logger?.trace(`[${commandId}] ${operationName} command was executed successfully`);

        return result;
    }

    private async handleRaiseNotification({ settings, id }: RaiseNotificationConfig, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] handling a raise notification message with a title: ${settings.title}`);

        const hasDefinedActions = settings.actions && settings.actions.length;

        if (hasDefinedActions) {

            this.logger?.trace(`[${commandId}] notification with a title: ${settings.title} was found to be persistent and therefore the service worker will be instructed to raise it.`);

            await this.serviceWorkerController.showNotification(settings, id);
        } else {
            this.logger?.trace(`[${commandId}] notification with a title: ${settings.title} was found to be non-persistent and therefore will be raised with the native notifications API`);

            this.raiseSimpleNotification(settings, id);
        }

        const definition = Object.assign({}, settings, { title: undefined, clickInterop: undefined, actions: undefined });

        const notificationEventPayload: NotificationEventPayload = { definition, id };

        // setImmediate allows the client which raises the event, to resolve the raise promise before receiving the show event
        // which in turn allows the user to not miss the event
        setTimeout(() => this.glueController.pushSystemMessage("notifications", "notificationShow", notificationEventPayload), 0);

        this.logger?.trace(`[${commandId}] notification with a title: ${settings.title} was successfully raised`);
    }

    private async handleRequestPermission(_: unknown, commandId: string): Promise<PermissionRequestResult> {
        this.logger?.trace(`[${commandId}] handling a request permission message`);

        const permissionValue = await Notification.requestPermission();

        const permissionGranted = permissionValue === "granted";

        this.logger?.trace(`[${commandId}] permission for raising notifications is: ${permissionValue}`);

        return { permissionGranted };
    }

    private callDefinedInterop(interopConfig: Glue42Web.Notifications.InteropActionSettings): void {
        const method = interopConfig.method;
        const args = interopConfig.arguments;
        const target = interopConfig.target;

        this.glueController.invokeMethod(method, args, target)
            .catch((err) => {
                const stringError = typeof err === "string" ? err : JSON.stringify(err.message);
                this.logger?.warn(`The interop invocation defined in the clickInterop was rejected, reason: ${stringError}`);
            });
    }

    private raiseSimpleNotification(settings: Glue42Web.Notifications.RaiseOptions, id: string): void {
        const options: NotificationOptions = Object.assign({}, settings, { title: undefined, clickInterop: undefined });

        const notification = new Notification(settings.title, options);

        notification.onclick = (event: any): void => {
            const glueData: GlueNotificationData = {
                id,
                clickInterop: settings.clickInterop
            };

            const definition = {
                badge: event.target.badge,
                body: event.target.body,
                data: event.target.data,
                dir: event.target.dir,
                icon: event.target.icon,
                image: event.target.image,
                lang: event.target.lang,
                renotify: event.target.renotify,
                requireInteraction: event.target.requireInteraction,
                silent: event.target.silent,
                tag: event.target.tag,
                timestamp: event.target.timestamp,
                vibrate: event.target.vibrate
            };

            this.handleNotificationClick({ action: "", glueData, definition });
        };
    }

}
