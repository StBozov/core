import { NgModule, APP_INITIALIZER, ModuleWithProviders } from "@angular/core";
import { Glue42Store } from "./glue-store.service";
import { Glue42NgSettings } from "./types";
import { Glue42Initializer } from "./glue-initializer.service";
import { CONFIG_TOKEN } from "./tokens";
import { GlueConfigService } from "./glue-config.service";

export const initFactory = (initializer: Glue42Initializer) => (): void | Promise<void> => initializer.start();

// @dynamic
@NgModule()
export class Glue42Ng {
    public static forRoot(settings?: Glue42NgSettings): ModuleWithProviders<Glue42Ng> {
        return {
            ngModule: Glue42Ng,
            providers: [
                {
                    provide: APP_INITIALIZER,
                    useFactory: initFactory,
                    multi: true,
                    deps: [Glue42Initializer, GlueConfigService, Glue42Store]
                },
                {
                    provide: CONFIG_TOKEN,
                    useValue: settings
                },
                GlueConfigService,
                Glue42Store,
                Glue42Initializer
            ]
        };
    }
}