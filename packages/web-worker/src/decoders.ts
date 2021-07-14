/* eslint-disable @typescript-eslint/no-explicit-any */
import { anyJson, array, boolean, Decoder, fail, object, optional, string } from "decoder-validate";
import { Glue42NotificationClickHandler, WebWorkerConfig } from "../web.worker";

export const nonEmptyStringDecoder: Decoder<string> = string().where((s) => s.length > 0, "Expected a non-empty string");

const functionCheck = (input: any, propDescription: string): Decoder<any> => {
    const providedType = typeof input;

    return providedType === "function" ?
        anyJson() :
        fail(`The provided argument as ${propDescription} should be of type function, provided: ${typeof providedType}`);
};

export const glue42NotificationClickHandlerDecoder: Decoder<Glue42NotificationClickHandler> = object({
    action: nonEmptyStringDecoder,
    handler: anyJson().andThen((result) => functionCheck(result, "handler"))
});

export const webWorkerConfigDecoder: Decoder<WebWorkerConfig> = object({
    platform: optional(object({
        url: nonEmptyStringDecoder,
        openIfMissing: optional(boolean())
    })),
    notifications: optional(object({
        defaultClick: optional(anyJson().andThen((result) => functionCheck(result, "defaultClick"))),
        actionClicks: optional(array(glue42NotificationClickHandlerDecoder))
    }))
});
