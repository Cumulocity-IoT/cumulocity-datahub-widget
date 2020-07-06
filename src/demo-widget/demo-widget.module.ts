import {CoreModule, HOOK_COMPONENTS} from "@c8y/ngx-components";
import {WidgetConfigDemo} from "./demo-widget-config.component";
import {WidgetDemo} from "./demo-widget.component";
import {NgModule} from "@angular/core";

// This will import css from the styles folder (Note: will be applied globally, not scoped to the module/components)
import '~styles/index.css';

// You can also import css from a module
// import 'some-module/styles.css'

@NgModule({
    imports: [
        CoreModule
    ],
    declarations: [WidgetDemo, WidgetConfigDemo],
    entryComponents: [WidgetDemo, WidgetConfigDemo],
    providers: [
        // Connect the widget to Cumulocity via the HOOK_COMPONENT injection token
        {
            provide: HOOK_COMPONENTS,
            multi: true,
            useValue: {
                id: 'acme.test.widget',
                label: 'Test widget',
                description: 'Displays some mirrored text',
                component: WidgetDemo,
                configComponent: WidgetConfigDemo,
            }
        }
    ],
})
export class DemoWidgetModule {}
