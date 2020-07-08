/*
* Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
*
* SPDX-License-Identifier: Apache-2.0
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
 */

import {CoreModule, HOOK_COMPONENTS} from "@c8y/ngx-components";
import {DatahubWidgetConfig} from "./datahub-widget-config.component";
import {NgModule} from "@angular/core";
import {DatahubWidgetComponent} from "./datahub-widget.component";
import {NgxDatatableModule} from "@swimlane/ngx-datatable";

// This will import css from the styles folder (Note: will be applied globally, not scoped to the module/components)
import '~styles/index.css';

@NgModule({
    imports: [
        CoreModule,
        NgxDatatableModule
    ],
    declarations: [DatahubWidgetComponent, DatahubWidgetConfig],
    entryComponents: [DatahubWidgetComponent, DatahubWidgetConfig],
    providers: [
        // Connect the widget to Cumulocity via the HOOK_COMPONENTS injection token
        {
            provide: HOOK_COMPONENTS,
            multi: true,
            useValue: [{
                id: 'softwareag.globalpresales.datahubwidget',
                label: 'DataHub table',
                description: 'Displays DataHub query results in a table',
                component: DatahubWidgetComponent,
                configComponent: DatahubWidgetConfig,
                previewImage: require("~styles/previewImage.png"),
                data: {
                    settings: {
                        noDeviceTarget: true
                    }
                }
            }]
        }
    ],
})
export class DatahubWidgetModule {}
