import { Glue42Web } from "@glue42/web";
import { anyJson, array, boolean, constant, Decoder, number, object, oneOf, optional, string } from "decoder-validate";
import { nonEmptyStringDecoder, nonNegativeNumberDecoder } from "../../shared/decoders";
import { NotificationsOperationsTypes, PermissionRequestResult, RaiseNotificationConfig } from "./types";

export const notificationsOperationDecoder: Decoder<NotificationsOperationsTypes> = oneOf<"raiseNotification" | "requestPermission">(
    constant("raiseNotification"),
    constant("requestPermission")
);


const interopActionSettingsDecoder: Decoder<Glue42Web.Notifications.InteropActionSettings> = object({
    method: nonEmptyStringDecoder,
    arguments: optional(anyJson()),
    target: optional(oneOf<"all" | "best">(
        constant("all"),
        constant("best")
    ))
});

const glue42NotificationActionDecoder: Decoder<Glue42Web.Notifications.NotificationAction> = object({
    action: string(),
    title: nonEmptyStringDecoder,
    icon: optional(string()),
    interop: optional(interopActionSettingsDecoder)
});

const glue42NotificationOptionsDecoder: Decoder<Glue42Web.Notifications.RaiseOptions> = object({
    title: nonEmptyStringDecoder,
    clickInterop: optional(interopActionSettingsDecoder),
    actions: optional(array(glue42NotificationActionDecoder)),
    badge: optional(string()),
    body: optional(string()),
    data: optional(anyJson()),
    dir: optional(oneOf<"auto" | "ltr" | "rtl">(
        constant("auto"),
        constant("ltr"),
        constant("rtl")
    )),
    icon: optional(string()),
    image: optional(string()),
    lang: optional(string()),
    renotify: optional(boolean()),
    requireInteraction: optional(boolean()),
    silent: optional(boolean()),
    tag: optional(string()),
    timestamp: optional(nonNegativeNumberDecoder),
    vibrate: optional(array(number()))
});

export const raiseNotificationDecoder: Decoder<RaiseNotificationConfig> = object({
    settings: glue42NotificationOptionsDecoder,
    id: nonEmptyStringDecoder
});

export const permissionRequestResultDecoder: Decoder<PermissionRequestResult> = object({
    permissionGranted: boolean()
});