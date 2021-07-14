import { Glue42Web } from "../../web";
import { notificationEventPayloadDecoder, permissionRequestResultDecoder, raiseNotificationDecoder } from "../shared/decoders";
import { BridgeOperation } from "../shared/types";

export type NotificationsOperationTypes = "raiseNotification" | "requestPermission" | "notificationShow" | "notificationClick";

export const operations: { [key in NotificationsOperationTypes]: BridgeOperation } = {
    raiseNotification: { name: "raiseNotification", dataDecoder: raiseNotificationDecoder },
    requestPermission: { name: "requestPermission", resultDecoder: permissionRequestResultDecoder },
    notificationShow: { name: "notificationShow", dataDecoder: notificationEventPayloadDecoder },
    notificationClick: { name: "notificationClick", dataDecoder: notificationEventPayloadDecoder }
};

export interface RaiseNotification {
    settings: Glue42Web.Notifications.RaiseOptions;
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