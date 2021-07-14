import { Glue42Web } from "@glue42/web";

export type NotificationsOperationsTypes = "raiseNotification" | "requestPermission";

export interface RaiseNotificationConfig {
    settings: Glue42Web.Notifications.RaiseOptions;
    id: string;
}

export interface GlueNotificationData {
    clickInterop?: Glue42Web.Notifications.InteropActionSettings;
    actions?: Glue42Web.Notifications.NotificationAction[];
    id: string;
}

export interface PermissionRequestResult {
    permissionGranted: boolean;
}

export interface NotificationEventPayload {
    definition: Glue42Web.Notifications.NotificationDefinition;
    action?: string;
    id?: string;
}
