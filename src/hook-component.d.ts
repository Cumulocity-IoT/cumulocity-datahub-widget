import {InjectionToken} from "@angular/core";

// The runtime widget loader patches @c8y/ngx-components to re-add HOOK_COMPONENT improving backwards compatibility
declare module "@c8y/ngx-components" {
    const HOOK_COMPONENT: InjectionToken<unknown>;
}
