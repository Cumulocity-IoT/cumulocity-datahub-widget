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

import {Component, Input, OnDestroy} from '@angular/core';
import {switchMap} from "rxjs/operators";
import {from, Subject, Subscription} from "rxjs";
import {QueryWrapperService} from "./datahub-query-wrapper-service";

export interface IDatahubWidgetConfig {
    queryString: string,
    columns: {
        colName: string,
        displayName: string,
        visibility: 'visible' | 'hidden'
    }[]
}

@Component({
    template: `
        <div class="form-group">
            <c8y-form-group>
                <label translate>Text</label>
                <textarea class="form-control" [(ngModel)]="config.queryString"
                          (change)="updateColumnDefinitions()"></textarea>
            </c8y-form-group>
            <table class="table">
                <thead>
                    <button (click)="updateColumnDefinitions()">Refresh</button>
                    <tr>
                        <th>Visible</th>
                        <th>Datahub Column</th>
                        <th>Label</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let col of config.columns">
                        <td><input class="form-control" type="checkbox" [checked]="col.visibility == 'visible'" (change)="col.visibility = $any($event.target).checked ? 'visible' : 'hidden'"/></td>
                        <td>{{col.colName}}</td>
                        <td><input class="form-control" [(ngModel)]="col.displayName"/></td>
                    </tr>
                </tbody>
            </table>
        </div>`
})
export class DatahubWidgetConfig implements OnDestroy {
    _config: IDatahubWidgetConfig = {
        queryString: '',
        columns: []
    };

    @Input() set config(config: IDatahubWidgetConfig) {
        this._config = Object.assign(config, {
            ...this._config,
            ...config
        });
    };
    get config(): IDatahubWidgetConfig {
        return this._config
    }

    querySubject = new Subject<string>()
    subscriptions = new Subscription();

    constructor(private queryService: QueryWrapperService) {
        this.subscriptions.add(
            this.querySubject
                .pipe(switchMap(query => from(this.queryService.queryForResults(query))))
                .subscribe(result => {
                    this.config.columns = result.schema
                        .map(column => column.name)
                        .map(colName => {
                            let matchingColumn = this.config.columns.find(col => col.colName == colName);
                            if (matchingColumn) {
                                return matchingColumn;
                            } else {
                                return {
                                    colName,
                                    displayName: this.formatHeading(colName),
                                    visibility: 'visible'
                                };
                            }
                        });
                })
        );
    }

    updateColumnDefinitions() {
        this.querySubject.next(this.config.queryString);
    }

    formatHeading(value: string): string {
        return value.replace(/_/g, " ").replace(/([^A-Z\s])(?=[A-Z])/g, "$1 ").replace(/\s+/g, " ")
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
}
